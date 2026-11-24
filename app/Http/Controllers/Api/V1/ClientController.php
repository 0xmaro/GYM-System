<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Http\Resources\ClientResource;
use App\Jobs\SendWelcomeMessage;
use App\Jobs\SendWhatsAppMessage;
use App\Models\Client;
use App\Models\ClientSubscription;
use App\Models\Debt;
use App\Models\QrCard;
use App\Models\StaffShift;
use App\Models\SubscriptionType;
use App\Models\Transaction;
use App\Models\WhatsappLog;
use App\Models\WhatsappTemplate;
use App\Services\AuditLogService;
use App\Services\QrIdGenerator;
use App\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ClientController extends Controller
{
    // ─────────────────────────────────────────────────────────────
    // INDEX
    // ─────────────────────────────────────────────────────────────
 public function index(Request $request): AnonymousResourceCollection
{
    $query = Client::with('activeSubscription.subscriptionType');

    if ($request->filled('search')) {
        $search = $request->search;
        $query->where(function ($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('qr_id', 'like', "%{$search}%");
        });
    }

    if ($request->filled('status')) {
        $query->where('status', $request->status);
    }

    if ($request->filled('gender')) {
        $scopes = \App\Models\Scopes\GenderScope::class;
        if (class_exists($scopes)) {
            $query->withoutGlobalScopes([$scopes]);
        }
        $query->where('gender', $request->gender);
    }

    if ($request->filled('expiring_soon')) {
        $days = (int) $request->expiring_soon;
        $query->whereHas('subscriptions', function ($q) use ($days) {
            $q->whereDate('end_date', '<=', now()->addDays($days)->toDateString())
              ->whereDate('end_date', '>=', now()->toDateString());
        });
    }

    // ✅ فلتر انتهاء الاشتراك من تاريخ إلى تاريخ — على كل الاشتراكات
    if ($request->filled('expiry_from') || $request->filled('expiry_to')) {
        $from = $request->input('expiry_from');
        $to   = $request->input('expiry_to');

        $query->whereHas('subscriptions', function ($q) use ($from, $to) {
            if ($from) {
                $q->whereDate('end_date', '>=', $from);
            }

            if ($to) {
                $q->whereDate('end_date', '<=', $to);
            }
        });
    }

    $perPage = min((int) ($request->per_page ?? 20), 100);

    return ClientResource::collection(
        $query->latest()->paginate($perPage)
    );
}

    // ─────────────────────────────────────────────────────────────
    // STORE
    // ─────────────────────────────────────────────────────────────
    public function store(StoreClientRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            // ─── 1. تحديد الـ QR ID ───────────────────────────────────
            if ($request->filled('qr_id')) {
                $qrId = $request->qr_id;

                $card = QrCard::where('qr_id', $qrId)->lockForUpdate()->first();

                if (! $card) {
                    return response()->json([
                        'message' => 'الكارت غير موجود في النظام.',
                        'errors'  => ['qr_id' => ['الكارت غير موجود — أضفه من مخزون الكروت أولاً']],
                    ], 422);
                }

                if ($card->status !== 'available') {
                    $reason = match ($card->status) {
                        'distributed' => 'مرتبط بعضو آخر: ' . ($card->client?->name ?? '—'),
                        'cancelled'   => 'ملغي',
                        'damaged'     => 'تالف',
                        'lost'        => 'مبلّغ عن ضياعه',
                        default       => 'غير متاح',
                    };

                    return response()->json([
                        'message' => "الكارت رقم {$qrId} غير متاح — {$reason}.",
                        'errors'  => ['qr_id' => ["الكارت غير متاح — {$reason}"]],
                    ], 409);
                }
            } else {
                $qrId = QrIdGenerator::getAvailable();
                $card = QrCard::where('qr_id', $qrId)->lockForUpdate()->first();
            }

            // ─── 2. إنشاء العضو ───────────────────────────────────────
            $client = Client::create([
                ...$request->only('name', 'phone', 'gender', 'age', 'address', 'photo_url', 'notes'),
                'qr_id'  => $qrId,
                'status' => 'active',
            ]);

            // ─── 3. ربط الكارت بالعضو ─────────────────────────────────
            $card->update([
                'client_id' => $client->id,
                'status'    => 'distributed',
                'issued_at' => now(),
            ]);

            // ─── 4. إنشاء اشتراك لو موجود ────────────────────────────
            if ($request->filled('subscription_type_id')) {
                $subscription = $this->createSubscription($client, $request);

                // ✅ رسالة الترحيب لو مطلوبة من الواجهة
                if ($request->boolean('send_welcome', false)) {
                    SendWelcomeMessage::dispatch($subscription);
                }
            }

            AuditLogService::log(
                'client.create',
                'Client',
                $client->id,
                [],
                $client->toArray()
            );

            return (new ClientResource(
                $client->load('activeSubscription.subscriptionType')
            ))->response()->setStatusCode(201);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // SHOW
    // ─────────────────────────────────────────────────────────────
    public function show(Client $client): JsonResponse
    {
        $client->load([
            'activeSubscription.subscriptionType',
            'subscriptions.subscriptionType',
            'qrCard',
            'debts',
        ]);

        return (new ClientResource($client))->response();
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────

public function update(UpdateClientRequest $request, Client $client): ClientResource
{
    return DB::transaction(function () use ($request, $client) {
        $client = Client::withoutGlobalScopes()
            ->lockForUpdate()
            ->findOrFail($client->id);

        $validated = $request->validated();
        $old = $client->load('qrCard')->toArray();

        $newQrId = array_key_exists('qr_id', $validated)
            ? trim((string) $validated['qr_id'])
            : $client->qr_id;

        $oldQrId = $client->qr_id;

        unset($validated['qr_id']);

        // تحديث البيانات الأساسية
        $client->update($validated);

        // لو ما فيش تغيير في الكارت
        if ($newQrId === $oldQrId) {
            AuditLogService::log(
                'client.update',
                'Client',
                $client->id,
                $old,
                $client->fresh()->load('activeSubscription.subscriptionType', 'qrCard')->toArray()
            );

            return new ClientResource(
                $client->fresh()->load('activeSubscription.subscriptionType', 'qrCard')
            );
        }

        // لو المستخدم فضّى الكارت - ممكن تمنع ده لو مش عاوزه
        if ($newQrId === '') {
            if ($oldQrId) {
                $oldCard = QrCard::where('qr_id', $oldQrId)->lockForUpdate()->first();

                if ($oldCard && (int) $oldCard->client_id === (int) $client->id) {
                    $oldCard->update([
                        'client_id' => null,
                        'last_client_id' => $client->id,
                        'status' => 'available',
                        'returned_at' => now(),
                        'issued_at' => $oldCard->issued_at,
                    ]);
                }
            }

            $client->update(['qr_id' => null]);

            AuditLogService::log(
                'client.update',
                'Client',
                $client->id,
                $old,
                $client->fresh()->load('activeSubscription.subscriptionType', 'qrCard')->toArray()
            );

            return new ClientResource(
                $client->fresh()->load('activeSubscription.subscriptionType', 'qrCard')
            );
        }

        $newCard = QrCard::with('client:id,name')
            ->where('qr_id', $newQrId)
            ->lockForUpdate()
            ->first();

        if (! $newCard) {
            abort(response()->json([
                'message' => 'الكارت غير موجود في النظام.',
                'errors' => [
                    'qr_id' => ['الكارت غير موجود — أضفه من مخزون الكروت أولًا.'],
                ],
            ], 422));
        }

        // لو الكارت مربوط بعميل آخر
        if (
            $newCard->status === 'distributed'
            && $newCard->client_id
            && (int) $newCard->client_id !== (int) $client->id
        ) {
            abort(response()->json([
                'message' => 'الكارت غير متاح — مرتبط بعضو آخر.',
                'errors' => [
                    'qr_id' => ['الكارت مرتبط بعضو آخر: ' . ($newCard->client?->name ?? '—')],
                ],
            ], 409));
        }

        // لو حالته غير صالحة
        if (
            ! in_array($newCard->status, ['available', 'returned', 'distributed'], true)
            || (
                $newCard->status === 'distributed'
                && (int) $newCard->client_id !== (int) $client->id
            )
        ) {
            $reason = match ($newCard->status) {
                'cancelled' => 'ملغي',
                'damaged'   => 'تالف',
                'lost'      => 'مبلّغ عن ضياعه',
                default     => 'غير متاح',
            };

            abort(response()->json([
                'message' => "الكارت غير متاح — {$reason}.",
                'errors' => [
                    'qr_id' => ["الكارت غير متاح — {$reason}"],
                ],
            ], 422));
        }

        // تحرير الكارت القديم
        if ($oldQrId) {
            $oldCard = QrCard::where('qr_id', $oldQrId)
                ->lockForUpdate()
                ->first();

            if ($oldCard && (int) $oldCard->client_id === (int) $client->id && $oldCard->id !== $newCard->id) {
                $oldCard->update([
                    'client_id' => null,
                    'last_client_id' => $client->id,
                    'status' => 'available',
                    'returned_at' => now(),
                ]);
            }
        }

        // ربط الكارت الجديد بالعميل
        $newCard->update([
            'client_id' => $client->id,
            'last_client_id' => $client->id,
            'status' => 'distributed',
            'issued_at' => $newCard->issued_at ?? now(),
            'returned_at' => null,
            'lost_at' => null,
            'damaged_at' => null,
            'cancelled_at' => null,
        ]);

        $client->update([
            'qr_id' => $newQrId,
        ]);

        AuditLogService::log(
            'client.update',
            'Client',
            $client->id,
            $old,
            $client->fresh()->load('activeSubscription.subscriptionType', 'qrCard')->toArray()
        );

        return new ClientResource(
            $client->fresh()->load('activeSubscription.subscriptionType', 'qrCard')
        );
    });
}

    // ─────────────────────────────────────────────────────────────
    // DESTROY
    // ─────────────────────────────────────────────────────────────
    public function destroy(Client $client): JsonResponse
    {
        $snapshot = $client->load(['subscriptions', 'debts'])->toArray();

        AuditLogService::log('client.delete', 'Client', $client->id, $snapshot, []);

        $client->delete();

        return response()->json(['message' => 'تم حذف العضو بنجاح.'], 200);
    }

    // ─────────────────────────────────────────────────────────────
    // FREEZE
    // ─────────────────────────────────────────────────────────────
    public function freeze(Request $request, Client $client): JsonResponse
    {
        $request->validate([
            'freeze_days' => 'required|integer|min:1|max:30',
            'reason'      => 'required|string|max:255',
        ]);

        $subscription = $client->activeSubscription;

        if (! $subscription || ! $subscription->isActive()) {
            return response()->json(['message' => 'لا يوجد اشتراك نشط للتجميد.'], 422);
        }

        $type       = $subscription->subscriptionType;
        $maxFreeze  = $type?->max_freeze_days ?? 30;
        $usedFreeze = $subscription->freeze_days_count ?? 0;

        if (($usedFreeze + $request->freeze_days) > $maxFreeze) {
            return response()->json([
                'message' => 'تجاوز الحد الأقصى للتجميد. المتبقي: ' . ($maxFreeze - $usedFreeze) . ' يوم.',
            ], 422);
        }

        $old = $subscription->toArray();

        $subscription->update([
            'status'            => 'frozen',
            'frozen_at'         => now(),
            'frozen_until'      => now()->addDays($request->freeze_days),
            'freeze_days_count' => $usedFreeze + $request->freeze_days,
            'end_date'          => $subscription->end_date->copy()->addDays($request->freeze_days),
            'freeze_reason'     => $request->reason,
        ]);

        $client->update(['status' => 'frozen']);

        AuditLogService::log(
            'subscription.freeze',
            'ClientSubscription',
            $subscription->id,
            $old,
            $subscription->fresh()->toArray()
        );

        return response()->json(['message' => 'تم تجميد الاشتراك بنجاح.']);
    }

    // ─────────────────────────────────────────────────────────────
    // UNFREEZE
    // ─────────────────────────────────────────────────────────────
    public function unfreeze(Client $client): JsonResponse
    {
        $subscription = $client->subscriptions()
            ->where('status', 'frozen')
            ->latest()
            ->first();

        if (! $subscription) {
            return response()->json(['message' => 'لا يوجد اشتراك مجمّد.'], 422);
        }

        $old = $subscription->toArray();

        $extraDays = 0;
        if ($subscription->frozen_until && now()->lt($subscription->frozen_until)) {
            $extraDays = (int) now()->diffInDays($subscription->frozen_until);
        }

        $subscription->update([
            'status'       => 'active',
            'frozen_at'    => null,
            'frozen_until' => null,
            'end_date'     => $extraDays > 0
                ? $subscription->end_date->copy()->addDays($extraDays)
                : $subscription->end_date,
        ]);

        $client->update(['status' => 'active']);

        AuditLogService::log(
            'subscription.unfreeze',
            'ClientSubscription',
            $subscription->id,
            $old,
            $subscription->fresh()->toArray()
        );

        // ✅ رسالة فك التجميد عبر نفس الـ pipeline
        $template = WhatsappTemplate::where('type', 'unfreeze_notification')
            ->where('enabled', true)
            ->first();

        if ($template && $client->phone) {
            $subscriptionRefreshed = $subscription->fresh();

            $variables = [
                'name'     => $client->name,
                'end_date' => $subscriptionRefreshed->end_date->toDateString(),
            ];

            $phone = WhatsAppService::normalizePhone($client->phone);

            if ($phone) {
                $log = WhatsappLog::create([
                    'client_id'       => $client->id,
                    'phone_number'    => $phone,
                    'template_type'   => 'unfreeze_notification',
                    'message_content' => $template->render($variables),
                    'status'          => 'pending',
                ]);

                SendWhatsAppMessage::dispatch($log);
            }
        }

        return response()->json([
            'message'    => 'تم فك التجميد بنجاح.',
            'extra_days' => $extraDays,
        ]);
    }


    // ─────────────────────────────────────────────────────────────
    // HELPER — إنشاء الاشتراك
    // ─────────────────────────────────────────────────────────────
    private function createSubscription(Client $client, StoreClientRequest $request): ClientSubscription
    {
        $type      = SubscriptionType::findOrFail($request->subscription_type_id);
        $startDate = Carbon::parse($request->start_date ?? now()->toDateString());

        $durationDays = $request->duration_days ?? $type->duration_days;
        $endDate      = $startDate->copy()->addDays($durationDays);

        $amountPaid  = (int) ($request->amount_paid ?? $type->price_monthly ?? 0);
        $discountAmt = (int) ($request->discount_amount ?? 0);
        $netAmount   = max(0, $amountPaid - $discountAmt);
        $isPaid      = $request->boolean('is_paid', true);

        $subscription = ClientSubscription::create([
            'client_id'            => $client->id,
            'subscription_type_id' => $type->id,
            'start_date'           => $startDate,
            'end_date'             => $endDate,
            'original_end_date'    => $endDate,
            'sessions_remaining'   => $type->sessions_count,
            'amount_paid'          => $netAmount,
            'discount_amount'      => $discountAmt,
            'discount_reason'      => $request->discount_reason,
            'status'               => 'active',
            'created_by'           => auth()->id(),
        ]);

        // ✅ تسجيل المعاملة لو دفع
        if ($isPaid && $netAmount > 0) {
            $currentShift = StaffShift::where('status', 'open')->first();

            Transaction::create([
                'type'            => 'income',
                'category'        => 'subscription',
                'amount'          => $netAmount,
                'client_id'       => $client->id,
                'subscription_id' => $subscription->id,
                'payment_method'  => $request->payment_method ?? 'cash',
                'cashier_id'      => auth()->id(),
                'shift_id'        => $currentShift?->id,
                'notes'           => "اشتراك باقة: {$type->name} ({$durationDays} يوم)",
            ]);
        }

        // ✅ تسجيل الدين لو لم يدفع
        if (! $isPaid && $netAmount > 0) {
            Debt::create([
                'client_id'  => $client->id,
                'amount'     => $netAmount,
                'reason'     => "اشتراك باقة: {$type->name} ({$durationDays} يوم) — بداية {$startDate->toDateString()}",
                'due_date'   => $endDate->toDateString(),
                'status'     => 'pending',
                'created_by' => auth()->id(),
            ]);
        }

        AuditLogService::log(
            'subscription.create',
            'ClientSubscription',
            $subscription->id,
            [],
            array_merge($subscription->toArray(), [
                'duration_days' => $durationDays,
                'is_paid'       => $isPaid,
            ])
        );

        return $subscription;
    }
}
