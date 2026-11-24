<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\SendDebtReminder;
use App\Jobs\SendExpiryReminder;
use App\Jobs\SendWhatsAppMessage;
use App\Models\ClientSubscription;
use App\Models\Debt;
use App\Models\Setting;
use App\Models\WhatsappLog;
use App\Models\WhatsappTemplate;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    // ─────────────────────────────────────────────────────────────
    // جلب كل التنبيهات المعلقة
    // ─────────────────────────────────────────────────────────────
    public function pendingAll(): JsonResponse
    {
        $daysSetting = Setting::where('key', 'expiry_reminder_days')->first();
        $days        = json_decode($daysSetting?->value ?? '[3,7]', true);
        $maxDays     = max($days);

        $expiring = ClientSubscription::with('client:id,name,phone')
            ->where('status', 'active')
            ->whereBetween('end_date', [today(), today()->addDays($maxDays)])
            ->get()
            ->map(fn($s) => [
                'id'               => $s->id,
                'client_id'        => $s->client_id,
                'client_name'      => $s->client?->name,
                'client_phone'     => $s->client?->phone,
                'end_date'         => $s->end_date->toDateString(),
                'days_remaining'   => today()->diffInDays($s->end_date),
                'last_notified_at' => $s->last_notified_at?->toISOString(),
                'notified_today'   => $s->last_notified_at?->isToday() ?? false,
            ]);

        $expired = ClientSubscription::with('client:id,name,phone')
            ->where('end_date', '<', today())
            ->where('status', '!=', 'expired')
            ->get()
            ->map(fn($s) => [
                'id'               => $s->id,
                'client_id'        => $s->client_id,
                'client_name'      => $s->client?->name,
                'client_phone'     => $s->client?->phone,
                'end_date'         => $s->end_date->toDateString(),
                'expired_days'     => $s->end_date->diffInDays(today()),
                'last_notified_at' => $s->last_notified_at?->toISOString(),
                'notified_today'   => $s->last_notified_at?->isToday() ?? false,
            ]);

        $debts = Debt::with('client:id,name,phone')
            ->where('status', 'pending')
            ->get()
            ->map(fn($d) => [
                'id'             => $d->id,
                'client_id'      => $d->client_id,
                'client_name'    => $d->client?->name,
                'client_phone'   => $d->client?->phone,
                'amount'         => $d->amount,
                'due_date'       => $d->due_date->toDateString(),
                'notified_at'    => $d->notified_at?->toISOString(),
                'notified_today' => $d->notified_at?->isToday() ?? false,
            ]);

        return response()->json([
            'expiring_count' => $expiring->count(),
            'expired_count'  => $expired->count(),
            'debts_count'    => $debts->count(),
            'expiring'       => $expiring,
            'expired'        => $expired,
            'debts'          => $debts,
            'bot_status'     => $this->getBotStatus(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // إرسال تذكير اشتراك يدوي (واحد)
    // ─────────────────────────────────────────────────────────────
    public function sendReminder($id): JsonResponse
    {
        $subscription = ClientSubscription::with(['client', 'subscriptionType'])->findOrFail($id);
        $client       = $subscription->client;

        if (!$client?->phone) {
            return response()->json(['message' => 'لا يوجد رقم هاتف للعميل.'], 422);
        }

        $isExpired    = $subscription->end_date->lt(today());
        $templateType = $isExpired ? 'subscription_expired_reminder' : 'expiry_reminder';

        $template = WhatsappTemplate::where('type', $templateType)
            ->where('enabled', true)
            ->first();

        if (!$template) {
            return response()->json(['message' => 'القالب غير متاح أو معطّل.'], 422);
        }

        $daysRemaining = $isExpired
            ? 0
            : max(0, now()->startOfDay()->diffInDays($subscription->end_date->startOfDay(), false));

        $variables = [
            'name'              => $client->name,
            'subscription_type' => $subscription->subscriptionType?->name ?? 'اشتراك',
            'days_remaining'    => $daysRemaining,
            'end_date'          => $subscription->end_date->toDateString(),
        ];

        $phone = WhatsAppService::normalizePhone($client->phone);

        $log = WhatsappLog::create([
            'client_id'       => $client->id,
            'template_type'   => $templateType,
            'message_content' => $template->render($variables),
            'phone_number'    => $phone,
            'status'          => 'pending',
        ]);

        SendWhatsAppMessage::dispatch($log);
        $subscription->update(['last_notified_at' => now()]);

        return response()->json([
            'message'          => 'تم جدولة الرسالة بنجاح ✅',
            'last_notified_at' => now()->toISOString(),
            'notified_today'   => true,
            'log_id'           => $log->id,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // إرسال تذكير دين يدوي (واحد)
    // ─────────────────────────────────────────────────────────────
    public function notifyDebt($id): JsonResponse
    {
        $debt   = Debt::with('client')->findOrFail($id);
        $client = $debt->client;

        if (!$client?->phone) {
            return response()->json(['message' => 'لا يوجد رقم هاتف للعميل.'], 422);
        }

        $template = WhatsappTemplate::where('type', 'debt_reminder')
            ->where('enabled', true)
            ->first();

        if (!$template) {
            return response()->json(['message' => 'قالب تذكير الدين غير متاح أو معطّل.'], 422);
        }

        $variables = [
            'name'           => $client->name,
            'amount_display' => number_format($debt->amount / 100, 2) . ' ج.م',
            'reason'         => $debt->reason,
            'due_date'       => $debt->due_date->toDateString(),
        ];

        $phone = WhatsAppService::normalizePhone($client->phone);

        $log = WhatsappLog::create([
            'client_id'       => $client->id,
            'template_type'   => 'debt_reminder',
            'message_content' => $template->render($variables),
            'phone_number'    => $phone,
            'status'          => 'pending',
        ]);

        SendWhatsAppMessage::dispatch($log);
        $debt->update(['notified_at' => now()]);

        return response()->json([
            'message'        => 'تم جدولة تنبيه الدين بنجاح ✅',
            'notified_at'    => now()->toISOString(),
            'notified_today' => true,
            'log_id'         => $log->id,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // إرسال جماعي (Bulk)
    // ─────────────────────────────────────────────────────────────
    public function sendBulk(Request $request): JsonResponse
    {
        $request->validate([
            'type' => ['required', 'in:expiring,expired,debts'],
        ]);

        $type    = $request->input('type');
        $count   = 0;
        $skipped = 0;

        // ─── اشتراكات قرب الانتهاء ───
        if ($type === 'expiring') {
            $daysSetting = Setting::where('key', 'expiry_reminder_days')->first();
            $maxDays     = max(json_decode($daysSetting?->value ?? '[3,7]', true));

            $subscriptions = ClientSubscription::with(['client', 'subscriptionType'])
                ->where('status', 'active')
                ->whereBetween('end_date', [today(), today()->addDays($maxDays)])
                ->get();

            $template = WhatsappTemplate::where('type', 'expiry_reminder')
                ->where('enabled', true)
                ->first();

            if (!$template) {
                return response()->json(['message' => 'قالب التذكير غير متاح أو معطّل.'], 422);
            }

            foreach ($subscriptions as $sub) {
                if (!$sub->client?->phone)             { $skipped++; continue; }
                if ($sub->last_notified_at?->isToday()) { $skipped++; continue; }

                // تأكد مفيش رسالة تم إرسالها اليوم لهذا العميل
                $alreadySent = WhatsappLog::where('client_id', $sub->client_id)
                    ->where('template_type', 'expiry_reminder')
                    ->whereDate('created_at', today())
                    ->exists();

                if ($alreadySent) { $skipped++; continue; }

                $daysRemaining = max(0, now()->startOfDay()->diffInDays($sub->end_date->startOfDay(), false));

                $variables = [
                    'name'              => $sub->client->name,
                    'subscription_type' => $sub->subscriptionType?->name ?? 'اشتراك',
                    'days_remaining'    => $daysRemaining,
                    'end_date'          => $sub->end_date->toDateString(),
                ];

                $phone = WhatsAppService::normalizePhone($sub->client->phone);

                $log = WhatsappLog::create([
                    'client_id'       => $sub->client_id,
                    'template_type'   => 'expiry_reminder',
                    'message_content' => $template->render($variables),
                    'phone_number'    => $phone,
                    'status'          => 'pending',
                ]);

                // تأخير 3 ثواني بين كل رسالة لتفادي spam
                SendWhatsAppMessage::dispatch($log);
                $sub->update(['last_notified_at' => now()]);
                $count++;
            }
        }

        // ─── اشتراكات منتهية ───
        if ($type === 'expired') {
            $subscriptions = ClientSubscription::with(['client', 'subscriptionType'])
                ->where('end_date', '<', today())
                ->where('status', '!=', 'expired')
                ->get();

            $template = WhatsappTemplate::where('type', 'subscription_expired_reminder')
                ->where('enabled', true)
                ->first();

            if (!$template) {
                return response()->json(['message' => 'قالب الاشتراكات المنتهية غير متاح أو معطّل.'], 422);
            }

            foreach ($subscriptions as $sub) {
                if (!$sub->client?->phone)              { $skipped++; continue; }
                if ($sub->last_notified_at?->isToday()) { $skipped++; continue; }

                $alreadySent = WhatsappLog::where('client_id', $sub->client_id)
                    ->where('template_type', 'subscription_expired_reminder')
                    ->whereDate('created_at', today())
                    ->exists();

                if ($alreadySent) { $skipped++; continue; }

                $variables = [
                    'name'     => $sub->client->name,
                    'end_date' => $sub->end_date->toDateString(),
                ];

                $phone = WhatsAppService::normalizePhone($sub->client->phone);

                $log = WhatsappLog::create([
                    'client_id'       => $sub->client_id,
                    'template_type'   => 'subscription_expired_reminder',
                    'message_content' => $template->render($variables),
                    'phone_number'    => $phone,
                    'status'          => 'pending',
                ]);

                SendWhatsAppMessage::dispatch($log);
                $sub->update(['last_notified_at' => now()]);
                $count++;
            }
        }

        // ─── ديون ───
        if ($type === 'debts') {
            $debts = Debt::with('client')->where('status', 'pending')->get();

            $template = WhatsappTemplate::where('type', 'debt_reminder')
                ->where('enabled', true)
                ->first();

            if (!$template) {
                return response()->json(['message' => 'قالب تذكير الدين غير متاح أو معطّل.'], 422);
            }

            foreach ($debts as $debt) {
                if (!$debt->client?->phone)          { $skipped++; continue; }
                if ($debt->notified_at?->isToday())  { $skipped++; continue; }

                $alreadySent = WhatsappLog::where('client_id', $debt->client_id)
                    ->where('template_type', 'debt_reminder')
                    ->whereDate('created_at', today())
                    ->exists();

                if ($alreadySent) { $skipped++; continue; }

                $variables = [
                    'name'           => $debt->client->name,
                    'amount_display' => number_format($debt->amount / 100, 2) . ' ج.م',
                    'reason'         => $debt->reason,
                    'due_date'       => $debt->due_date->toDateString(),
                ];

                $phone = WhatsAppService::normalizePhone($debt->client->phone);

                $log = WhatsappLog::create([
                    'client_id'       => $debt->client_id,
                    'template_type'   => 'debt_reminder',
                    'message_content' => $template->render($variables),
                    'phone_number'    => $phone,
                    'status'          => 'pending',
                ]);

                SendWhatsAppMessage::dispatch($log);
                $debt->update(['notified_at' => now()]);
                $count++;
            }
        }

        return response()->json([
            'message' => "تم جدولة {$count} رسالة بنجاح ✅",
            'sent'    => $count,
            'skipped' => $skipped,
            'note'    => $skipped > 0
                ? "{$skipped} عملاء تم تخطيهم (تم تنبيههم اليوم أو لا يوجد رقم)"
                : null,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // جلب لوج الرسائل
    // ─────────────────────────────────────────────────────────────
    public function logs(Request $request): JsonResponse
    {
        $logs = WhatsappLog::with('client:id,name,phone')
            ->latest()
            ->paginate($request->input('per_page', 20));

        return response()->json($logs);
    }

    // ─────────────────────────────────────────────────────────────
    // حالة البوت (internal helper)
    // ─────────────────────────────────────────────────────────────
    private function getBotStatus(): array
    {
        try {
            $botUrl = rtrim(config('services.whatsapp_bot.url', 'http://localhost:5004'), '/');
            $token  = config('services.whatsapp_bot.token', '');

            $response = Http::timeout(5)
                ->withHeaders(['Authorization' => "Bearer {$token}"])
                ->get("{$botUrl}/api/whatsapp/status");

            if ($response->successful()) {
                return [
                    'connected' => $response->json('connected', false),
                    'status'    => $response->json('status', 'unknown'),
                    'number'    => $response->json('number'),
                ];
            }
        } catch (\Throwable $e) {
            Log::warning('WhatsApp bot status check failed: ' . $e->getMessage());
        }

        return ['connected' => false, 'status' => 'unreachable', 'number' => null];
    }
}
