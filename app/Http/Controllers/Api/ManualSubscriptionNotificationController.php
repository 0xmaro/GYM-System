<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientSubscription;
use App\Models\Setting;
use App\Models\WhatsappLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManualSubscriptionNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $showSent = $request->boolean('show_sent', true);
        $today = today();
        $threeDaysLater = today()->copy()->addDays(3);

        $gymName = Setting::where('key', 'gym_name')->value('value')
            ?? config('app.name', 'GymOS');

        $baseQuery = ClientSubscription::query()
            ->with([
                'client:id,name,phone,qr_id,status',
                'subscriptionType:id,name',
            ])
            ->whereNotNull('end_date')
            ->whereHas('client');

        $expired = (clone $baseQuery)
            ->whereDate('end_date', '<', $today)
            ->when(! $showSent, fn ($q) => $q->whereNull('manual_notified_at'))
            ->orderBy('end_date', 'asc')
            ->get()
            ->map(function ($s) use ($today, $gymName) {
                return [
                    'id' => $s->id,
                    'client_id' => $s->client_id,
                    'client_name' => $s->client?->name,
                    'client_phone' => $s->client?->phone,
                    'client_qr_id' => $s->client?->qr_id,
                    'subscription_type' => $s->subscriptionType?->name,
                    'start_date' => optional($s->start_date)->toDateString(),
                    'end_date' => optional($s->end_date)->toDateString(),
                    'days_diff' => $s->end_date?->diffInDays($today),
                    'status_group' => 'expired',
                    'manual_notified_at' => optional($s->manual_notified_at)?->toISOString(),
                    'manual_notified' => ! is_null($s->manual_notified_at),
                    'wa_url' => $this->buildWaUrl(
                        $s->client?->phone,
                        $this->buildExpiredMessage(
                            $s->client?->name,
                            $gymName,
                            optional($s->end_date)->toDateString()
                        )
                    ),
                ];
            });

        $expiringSoon = (clone $baseQuery)
            ->whereDate('end_date', '>=', $today)
            ->whereDate('end_date', '<=', $threeDaysLater)
            ->whereIn('status', ['active', 'frozen'])
            ->when(! $showSent, fn ($q) => $q->whereNull('manual_notified_at'))
            ->orderBy('end_date', 'asc')
            ->get()
            ->map(function ($s) use ($today, $gymName) {
                return [
                    'id' => $s->id,
                    'client_id' => $s->client_id,
                    'client_name' => $s->client?->name,
                    'client_phone' => $s->client?->phone,
                    'client_qr_id' => $s->client?->qr_id,
                    'subscription_type' => $s->subscriptionType?->name,
                    'start_date' => optional($s->start_date)->toDateString(),
                    'end_date' => optional($s->end_date)->toDateString(),
                    'days_diff' => $today->diffInDays($s->end_date, false),
                    'status_group' => 'expiring',
                    'manual_notified_at' => optional($s->manual_notified_at)?->toISOString(),
                    'manual_notified' => ! is_null($s->manual_notified_at),
                    'wa_url' => $this->buildWaUrl(
                        $s->client?->phone,
                        $this->buildExpiringMessage(
                            $s->client?->name,
                            $gymName,
                            optional($s->end_date)->toDateString()
                        )
                    ),
                ];
            });

        return response()->json([
            'gym_name' => $gymName,
            'expired' => $expired->values(),
            'expiring_soon' => $expiringSoon->values(),
            'expired_count' => $expired->count(),
            'expiring_soon_count' => $expiringSoon->count(),
        ]);
    }

    public function markAsSent(Request $request, ClientSubscription $subscription): JsonResponse
    {
        $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $subscription->load('client');

        if (! $subscription->client?->phone) {
            return response()->json([
                'message' => 'لا يوجد رقم هاتف لهذا العميل.',
            ], 422);
        }

        $now = now();

        $subscription->update([
            'manual_notified_at' => $now,
            'manual_notified_by' => auth()->id(),
        ]);

        WhatsappLog::create([
            'client_id' => $subscription->client_id,
            'template_type' => 'manual_subscription_notice',
            'message_content' => $request->message,
            'phone_number' => $subscription->client->phone,
            'status' => 'sent',
            'sent_at' => $now,
        ]);

        return response()->json([
            'message' => 'تم تسجيل الإرسال اليدوي بنجاح.',
            'manual_notified_at' => $now->toISOString(),
            'manual_notified_by' => auth()->id(),
        ]);
    }

    private function buildExpiredMessage(?string $clientName, string $gymName, ?string $endDate): string
    {
        $name = $clientName ?: 'عميلنا العزيز';
        $date = $endDate ?: 'موعد سابق';

        return "أهلاً {$name} 🌟\n"
            . "نحب نفكرك إن اشتراكك في {$gymName} انتهى بتاريخ {$date}.\n"
            . "مستنيينك ترجع تكمل تمرينك معنا 💪\n"
            . "كلّمنا لتجديد الاشتراك.";
    }

    private function buildExpiringMessage(?string $clientName, string $gymName, ?string $endDate): string
    {
        $name = $clientName ?: 'عميلنا العزيز';
        $date = $endDate ?: 'قريبًا';

        return "أهلاً {$name} 🌟\n"
            . "اشتراكك في {$gymName} هينتهي بتاريخ {$date}.\n"
            . "جدده بدري وكمل على نفس الحماس 🔥\n"
            . "نورتنا دائمًا.";
    }

    private function buildWaUrl(?string $phone, string $message): ?string
    {
        if (! $phone) {
            return null;
        }

        $phone = preg_replace('/\D/', '', $phone);

        if (str_starts_with($phone, '0')) {
            $phone = '2' . $phone;
        }

        if (! str_starts_with($phone, '20')) {
            $phone = '20' . $phone;
        }

        return "https://wa.me/{$phone}?text=" . urlencode($message);
    }
}
