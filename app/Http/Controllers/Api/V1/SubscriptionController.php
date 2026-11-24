<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SubscriptionResource;
use App\Jobs\SendRenewalMessage;
use App\Jobs\SendWhatsAppMessage;
use App\Models\Client;
use App\Models\ClientSubscription;
use App\Models\Debt;
use App\Models\Setting;
use App\Models\StaffShift;
use App\Models\SubscriptionType;
use App\Models\Transaction;
use App\Models\WhatsappLog;
use App\Models\WhatsappTemplate;
use App\Services\AuditLogService;
use App\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'client_id'                 => 'required|exists:clients,id',
            'subscription_type_id'      => 'required|exists:subscription_types,id',
            'start_date'                => 'nullable|date',
            'duration_days'             => 'nullable|integer|min:1|max:3650',
            'amount_paid'               => 'required|integer|min:0',
            'discount_amount'           => 'nullable|integer|min:0',
            'discount_reason'           => 'nullable|string|max:255',
            'is_paid'                   => 'nullable|boolean',
            'payment_method'            => 'nullable|in:cash,card',
            'send_subscription_message' => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($request) {
            $type = SubscriptionType::findOrFail($request->subscription_type_id);

            $startDate    = Carbon::parse($request->start_date ?? now()->toDateString());
            $durationDays = (int) ($request->duration_days ?? $type->duration_days);
            $endDate      = $startDate->copy()->addDays($durationDays);

            $discountAmount = (int) ($request->discount_amount ?? 0);
            $netAmount      = max(0, (int) $request->amount_paid - $discountAmount);
            $isPaid         = $request->boolean('is_paid', true);

            $subscription = ClientSubscription::create([
                'client_id'            => $request->client_id,
                'subscription_type_id' => $type->id,
                'start_date'           => $startDate,
                'end_date'             => $endDate,
                'original_end_date'    => $endDate,
                'sessions_remaining'   => $type->sessions_count,
                'amount_paid'          => $netAmount,
                'discount_amount'      => $discountAmount,
                'discount_reason'      => $request->discount_reason,
                'status'               => 'active',
                'created_by'           => auth()->id(),
            ]);

            $currentShift = StaffShift::where('status', 'open')->first();

            if ($isPaid && $netAmount > 0) {
                Transaction::create([
                    'type'            => 'income',
                    'category'        => 'subscription',
                    'amount'          => $netAmount,
                    'client_id'       => $request->client_id,
                    'subscription_id' => $subscription->id,
                    'payment_method'  => $request->payment_method ?? 'cash',
                    'cashier_id'      => auth()->id(),
                    'shift_id'        => $currentShift?->id,
                    'notes'           => "اشتراك باقة: {$type->name} ({$durationDays} يوم)",
                ]);
            }

            if (! $isPaid && $netAmount > 0) {
                Debt::create([
                    'client_id'  => $request->client_id,
                    'amount'     => $netAmount,
                    'reason'     => "اشتراك باقة: {$type->name} ({$durationDays} يوم) — بداية {$startDate->toDateString()}",
                    'due_date'   => $endDate->toDateString(),
                    'status'     => 'pending',
                    'created_by' => auth()->id(),
                ]);
            }

            Client::where('id', $request->client_id)->update(['status' => 'active']);

            AuditLogService::log(
                'subscription.create',
                'ClientSubscription',
                $subscription->id,
                [],
                array_merge($subscription->toArray(), [
                    'duration_days'   => $durationDays,
                    'is_paid'         => $isPaid,
                    'discount_amount' => $discountAmount,
                ])
            );

            if ($request->boolean('send_subscription_message', true)) {
                $this->sendCreatedSubscriptionMessage($subscription->id);
            }

            return (new SubscriptionResource(
                $subscription->load('subscriptionType')
            ))->response()->setStatusCode(201);
        });
    }

    public function renew(Request $request, ClientSubscription $subscription): JsonResponse
    {
        $request->validate([
            'subscription_type_id' => 'nullable|exists:subscription_types,id',
            'duration_days'        => 'nullable|integer|min:1|max:3650',
            'amount_paid'          => 'required|integer|min:0',
            'discount_amount'      => 'nullable|integer|min:0',
            'discount_reason'      => 'nullable|string|max:255',
            'is_paid'              => 'nullable|boolean',
            'payment_method'       => 'nullable|in:cash,card',
        ]);

        return DB::transaction(function () use ($request, $subscription) {
            $typeId = $request->subscription_type_id ?? $subscription->subscription_type_id;
            $type   = SubscriptionType::findOrFail($typeId);

            $baseDate     = $subscription->end_date->isPast() ? now() : $subscription->end_date->copy()->addDay();
            $durationDays = (int) ($request->duration_days ?? $type->duration_days);
            $endDate      = $baseDate->copy()->addDays($durationDays);

            $discountAmount = (int) ($request->discount_amount ?? 0);
            $netAmount      = max(0, (int) $request->amount_paid - $discountAmount);
            $isPaid         = $request->boolean('is_paid', true);

            $old = $subscription->toArray();

            $subscription->update(['status' => 'expired']);

            $newSubscription = ClientSubscription::create([
                'client_id'            => $subscription->client_id,
                'subscription_type_id' => $type->id,
                'start_date'           => $baseDate,
                'end_date'             => $endDate,
                'original_end_date'    => $endDate,
                'sessions_remaining'   => $type->sessions_count,
                'amount_paid'          => $netAmount,
                'discount_amount'      => $discountAmount,
                'discount_reason'      => $request->discount_reason,
                'status'               => 'active',
                'created_by'           => auth()->id(),
            ]);

            $currentShift = StaffShift::where('status', 'open')->first();

            if ($isPaid && $netAmount > 0) {
                Transaction::create([
                    'type'            => 'income',
                    'category'        => 'subscription',
                    'amount'          => $netAmount,
                    'client_id'       => $subscription->client_id,
                    'subscription_id' => $newSubscription->id,
                    'payment_method'  => $request->payment_method ?? 'cash',
                    'cashier_id'      => auth()->id(),
                    'shift_id'        => $currentShift?->id,
                    'notes'           => "تجديد اشتراك باقة: {$type->name} ({$durationDays} يوم)",
                ]);
            }

            if (! $isPaid && $netAmount > 0) {
                Debt::create([
                    'client_id'  => $subscription->client_id,
                    'amount'     => $netAmount,
                    'reason'     => "تجديد اشتراك باقة: {$type->name} ({$durationDays} يوم) — بداية {$baseDate->toDateString()}",
                    'due_date'   => $endDate->toDateString(),
                    'status'     => 'pending',
                    'created_by' => auth()->id(),
                ]);
            }

            Client::where('id', $subscription->client_id)->update(['status' => 'active']);

            AuditLogService::log(
                'subscription.renew',
                'ClientSubscription',
                $newSubscription->id,
                $old,
                array_merge($newSubscription->toArray(), [
                    'duration_days'   => $durationDays,
                    'is_paid'         => $isPaid,
                    'discount_amount' => $discountAmount,
                ])
            );

            SendRenewalMessage::dispatch($newSubscription);

            return (new SubscriptionResource(
                $newSubscription->load('subscriptionType')
            ))->response()->setStatusCode(201);
        });
    }
public function update(Request $request, ClientSubscription $subscription): JsonResponse
{
    $request->validate([
        'start_date'         => ['nullable', 'date'],
        'end_date'           => ['nullable', 'date', 'after_or_equal:start_date'],
        'sessions_remaining' => ['nullable', 'integer', 'min:0'],
        'sessions_unlimited' => ['nullable', 'boolean'],
        'amount_paid'        => ['nullable', 'integer', 'min:0'],
        'discount_amount'    => ['nullable', 'integer', 'min:0'],
        'status'             => ['nullable', 'in:active,frozen,expired,pending'],
        'notes'              => ['nullable', 'string', 'max:1000'],
    ]);

    return DB::transaction(function () use ($request, $subscription) {
        $old = $subscription->toArray();

        $data = [];

        if ($request->filled('start_date')) {
            $data['start_date'] = $request->start_date;
        }

        if ($request->filled('end_date')) {
            $data['end_date'] = $request->end_date;
        }

        // لو حابب يخلي الحصص مفتوحة (null)
        if ($request->boolean('sessions_unlimited')) {
            $data['sessions_remaining'] = null;
        } elseif ($request->has('sessions_remaining')) {
            $data['sessions_remaining'] = $request->sessions_remaining;
        }

        if ($request->has('amount_paid')) {
            $data['amount_paid'] = $request->amount_paid;
        }

        if ($request->has('discount_amount')) {
            $data['discount_amount'] = $request->discount_amount;
        }

        if ($request->filled('status')) {
            $data['status'] = $request->status;
        }

        if ($request->filled('notes')) {
            $data['notes'] = $request->notes;
        }

        $subscription->update($data);

        // لو تغيّر التاريخ، حدّث الـ client status لو الاشتراك ده هو الأحدث
        if (isset($data['status'])) {
            $latestSub = ClientSubscription::where('client_id', $subscription->client_id)
                ->latest('end_date')
                ->first();

            if ($latestSub?->id === $subscription->id) {
                $clientStatus = match ($data['status']) {
                    'active' => 'active',
                    'frozen' => 'frozen',
                    default  => 'inactive',
                };
                Client::where('id', $subscription->client_id)
                    ->update(['status' => $clientStatus]);
            }
        }

        AuditLogService::log(
            'subscription.update',
            'ClientSubscription',
            $subscription->id,
            $old,
            $subscription->fresh()->toArray()
        );

        return response()->json([
            'message' => 'تم تحديث الاشتراك بنجاح.',
            'data'    => $subscription->fresh()->load('subscriptionType'),
        ]);
    });
}
    private function sendCreatedSubscriptionMessage(int $subscriptionId): void
    {
        $subscription = ClientSubscription::with(['client', 'subscriptionType'])->find($subscriptionId);

        if (! $subscription || ! $subscription->client?->phone) {
            return;
        }

        $client = $subscription->client;
        $type   = $subscription->subscriptionType;

        $template = WhatsappTemplate::where('type', 'welcome')
            ->where('enabled', true)
            ->first();

        if (! $template) {
            return;
        }

        $phone = WhatsAppService::normalizePhone($client->phone);

        if (! $phone) {
            return;
        }

        $gymName = Setting::getValue('gym_name', config('app.name', 'GymOS'));

        $variables = [
            'name'              => $client->name,
            'gym_name'          => $gymName,
            'subscription_type' => $type?->name ?? 'اشتراك',
            'end_date'          => $subscription->end_date->toDateString(),
            'sessions_count'    => $type?->sessions_count ?? 'غير محدود',
            'amount_display'    => number_format((float) $subscription->amount_paid, 0) . ' ج.م',
            'date'              => now()->toDateString(),
            'receipt_number'    => $subscription->id,
        ];

        $log = WhatsappLog::create([
            'client_id'       => $client->id,
            'template_type'   => 'welcome',
            'message_content' => $template->render($variables),
            'phone_number'    => $phone,
            'status'          => 'pending',
        ]);

        SendWhatsAppMessage::dispatch($log);
    }
}
