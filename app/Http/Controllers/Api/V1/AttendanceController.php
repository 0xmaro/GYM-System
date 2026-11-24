<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsAppMessage;
use App\Models\Attendance;
use App\Models\Client;
use App\Models\ClientSession;
use App\Models\ClientSubscription;
use App\Models\Debt;
use App\Models\QrCard;
use App\Models\SessionType;
use App\Models\Setting;
use App\Models\WhatsappLog;
use App\Models\WhatsappTemplate;
use App\Services\AuditLogService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Jobs\SendExpiryReminder;
use App\Jobs\SendSessionsAlert;

class AttendanceController extends Controller
{
    // ─────────────────────────────────────────────────────────────
    // QR SCAN
    // ─────────────────────────────────────────────────────────────
    public function qrScan(Request $request): JsonResponse
    {
        $request->validate([
            'qr_id' => 'required|string',
        ]);

        return DB::transaction(function () use ($request) {
            $card = QrCard::where('qr_id', $request->qr_id)
                ->where('status', 'distributed')
                ->first();

            if (! $card) {
                return response()->json([
                    'success' => false,
                    'status'  => 'unknown_card',
                    'message' => 'عفواً، هذا الكارت غير مسجل في النظام أو غير مُوزّع.',
                ], 404);
            }

            $client = Client::withoutGlobalScopes()->find($card->client_id);

            if (! $client) {
                return response()->json([
                    'success' => false,
                    'status'  => 'unknown_client',
                    'message' => 'العضو غير موجود.',
                ], 404);
            }

            // آخر اشتراك مهما كان حالته
            $lastSubscription = $client->subscriptions()
                ->with('subscriptionType')
                ->latest('end_date')
                ->lockForUpdate()
                ->first();

            // الاشتراك الفعلي للتعامل — active أو frozen أو fallback للأخير
            $subscription = $client->subscriptions()
                ->with('subscriptionType')
                ->whereIn('status', ['active', 'frozen'])
                ->latest('end_date')
                ->lockForUpdate()
                ->first() ?? $lastSubscription;

            $debt = Debt::where('client_id', $client->id)
                ->where('status', 'pending')
                ->orderByDesc('amount')
                ->first();

            if (! $subscription) {
                return response()->json([
                    'success'     => false,
                    'status'      => 'no_subscription',
                    'message'     => 'لا يوجد أي اشتراك مسجل لهذا العميل.',
                    'client_id'   => $client->id,
                    'client_name' => $client->name,
                ], 422);
            }

            // مجمّد
            if ($subscription->status === 'frozen') {
                return response()->json([
                    'success'         => false,
                    'status'          => 'frozen',
                    'message'         => 'الاشتراك مجمَّد حالياً.',
                    'client_id'       => $client->id,
                    'client_name'     => $client->name,
                    'subscription_id' => $subscription->id,
                    'end_date'        => optional($subscription->end_date)->toDateString(),
                ], 422);
            }

            // منتهي
            if ($subscription->end_date < now()->toDateString()) {
                $subscription->update(['status' => 'expired']);
                $this->maybeDispatchExpiryReminder($subscription);

                return response()->json([
                    'success'         => false,
                    'status'          => 'expired',
                    'message'         => 'الاشتراك منتهي الصلاحية. يمكنك التجديد أو إضافة حصة مدفوعة.',
                    'client_id'       => $client->id,
                    'client_name'     => $client->name,
                    'subscription_id' => $subscription->id,
                    'end_date'        => $subscription->end_date->toDateString(),
                ], 422);
            }

            // cooldown — منع الدخول المزدوج
            $cooldown = (int) Setting::getValue('attendance_cooldown_minutes', 240);

            $lastAttendance = Attendance::where('client_id', $client->id)
                ->where('check_in_at', '>=', now()->subMinutes($cooldown))
                ->first();

            if ($lastAttendance) {
                return response()->json([
                    'success'     => false,
                    'status'      => 'duplicate',
                    'message'     => 'سُجِّل دخول مسبقاً خلال فترة السماح.',
                    'client_id'   => $client->id,
                    'client_name' => $client->name,
                ], 422);
            }

            $daysRemaining     = $subscription->days_remaining;
            $sessionsRemaining = $subscription->sessions_remaining;

            // حصص خلصت
            if (! is_null($sessionsRemaining) && $sessionsRemaining <= 0) {
                $this->maybeDispatchSessionsAlert($subscription);

                return response()->json([
                    'success'         => false,
                    'status'          => 'no_sessions',
                    'message'         => 'عفواً، انتهت حصص الاشتراك. يمكنك بيع حصة/حزم إضافية أو تجديد الاشتراك.',
                    'client_id'       => $client->id,
                    'client_name'     => $client->name,
                    'subscription_id' => $subscription->id,
                    'end_date'        => $subscription->end_date->toDateString(),
                ], 422);
            }

            // تسجيل الحضور فعلياً
            $sessionsBefore = $sessionsRemaining;
            $sessionsAfter  = is_null($sessionsBefore) ? null : $sessionsBefore - 1;

            if (! is_null($sessionsAfter)) {
                $subscription->decrement('sessions_remaining');
            }

            $attendance = Attendance::create([
                'client_id'       => $client->id,
                'subscription_id' => $subscription->id,
                'check_in_at'     => now(),
                'type'            => 'qr',
                'sessions_before' => $sessionsBefore,
                'sessions_after'  => $sessionsAfter,
                'registered_by'   => auth()->id(),
            ]);

            $totalVisitsInSub = Attendance::where('subscription_id', $subscription->id)->count();

            $lastVisitFormatted = $client->last_visit_at
                ? $client->last_visit_at->translatedFormat('h:i A - Y/m/d')
                : 'أول زيارة';

            $client->update(['last_visit_at' => now()]);

            AuditLogService::log('attendance.qr', 'Attendance', $attendance->id, [], $attendance->toArray());

            // تنبيهات ما بعد التسجيل
            if ($daysRemaining <= 3 && $daysRemaining >= 0) {
                $this->maybeDispatchExpiryReminder($subscription);
            }

            if (! is_null($sessionsAfter) && $sessionsAfter <= 1) {
                $this->maybeDispatchSessionsAlert($subscription);
            }

            return response()->json([
                'success' => true,
                'status'  => 'success',
                'message' => 'تم تسجيل الحضور ✅',
                'data'    => [
                    'client' => [
                        'id'                  => $client->id,
                        'name'                => $client->name,
                        'qr_id'               => $client->qr_id,
                        'photo_url'           => $client->photo_url,
                        'phone'               => $client->phone,
                        'total_visits_in_sub' => $totalVisitsInSub,
                        'last_visit'          => $lastVisitFormatted,
                    ],
                    'subscription' => [
                        'sessions_remaining' => $sessionsAfter,
                        'days_remaining'     => $daysRemaining,
                        'status'             => $subscription->status,
                        'end_date'           => $subscription->end_date->toDateString(),
                    ],
                    'has_debt' => $debt ? [
                        'amount'   => $debt->amount,
                        'reason'   => $debt->reason,
                        'due_date' => $debt->due_date,
                    ] : null,
                ],
            ]);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // MANUAL
    // ─────────────────────────────────────────────────────────────
    public function manual(Request $request): JsonResponse
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
        ]);

        return DB::transaction(function () use ($request) {
            $client = Client::withoutGlobalScopes()->findOrFail($request->client_id);

            $subscription = $client->subscriptions()
                ->with('subscriptionType')
                ->where('status', 'active')
                ->latest()
                ->first();

            if (! $subscription) {
                return response()->json([
                    'success'     => false,
                    'status'      => 'no_subscription',
                    'message'     => 'لا يوجد اشتراك نشط.',
                    'client_id'   => $client->id,
                    'client_name' => $client->name,
                ], 422);
            }

            if ($subscription->end_date < now()->toDateString()) {
                $subscription->update(['status' => 'expired']);

                $this->sendAttendanceBlockNotification(
                    client: $client,
                    templateType: 'subscription_expired_reminder',
                    variables: [
                        'name'              => $client->name,
                        'gym_name'          => Setting::getValue('gym_name', config('app.name', 'GymOS')),
                        'subscription_type' => $subscription->subscriptionType?->name ?? 'اشتراك',
                        'end_date'          => $subscription->end_date->toDateString(),
                        'days_remaining'    => 0,
                    ]
                );

                return response()->json([
                    'success'     => false,
                    'status'      => 'expired',
                    'message'     => 'الاشتراك منتهي الصلاحية. تم إرسال تذكير بالتجديد.',
                    'client_id'   => $client->id,
                    'client_name' => $client->name,
                    'end_date'    => $subscription->end_date->toDateString(),
                ], 422);
            }

            if (! is_null($subscription->sessions_remaining) && $subscription->sessions_remaining <= 0) {
                $this->sendAttendanceBlockNotification(
                    client: $client,
                    templateType: 'sessions_empty',
                    variables: [
                        'name'              => $client->name,
                        'gym_name'          => Setting::getValue('gym_name', config('app.name', 'GymOS')),
                        'subscription_type' => $subscription->subscriptionType?->name ?? 'اشتراك',
                        'end_date'          => $subscription->end_date->toDateString(),
                        'days_remaining'    => now()->diffInDays($subscription->end_date, false),
                    ]
                );

                return response()->json([
                    'success'     => false,
                    'status'      => 'no_sessions',
                    'message'     => 'عفواً، انتهت حصص الاشتراك. تم إرسال تذكير بالتجديد.',
                    'client_id'   => $client->id,
                    'client_name' => $client->name,
                    'end_date'    => $subscription->end_date->toDateString(),
                ], 422);
            }

            $sessionsBefore = $subscription->sessions_remaining;
            $sessionsAfter  = is_null($sessionsBefore) ? null : $sessionsBefore - 1;

            if (! is_null($sessionsAfter)) {
                $subscription->decrement('sessions_remaining');
            }

            $attendance = Attendance::create([
                'client_id'       => $client->id,
                'subscription_id' => $subscription->id,
                'check_in_at'     => now(),
                'type'            => 'manual',
                'sessions_before' => $sessionsBefore,
                'sessions_after'  => $sessionsAfter,
                'registered_by'   => auth()->id(),
                'notes'           => $request->notes ?? 'تسجيل يدوي',
            ]);

            $client->update(['last_visit_at' => now()]);

            AuditLogService::log('attendance.manual', 'Attendance', $attendance->id, [], $attendance->toArray());

            return response()->json([
                'success' => true,
                'status'  => 'success',
                'message' => 'تم التسجيل يدوياً ✅',
                'data'    => [
                    'client' => [
                        'id'                  => $client->id,
                        'name'                => $client->name,
                        'qr_id'               => $client->qr_id,
                        'photo_url'           => $client->photo_url,
                        'phone'               => $client->phone,
                        'total_visits_in_sub' => Attendance::where('subscription_id', $subscription->id)->count(),
                        'last_visit'          => now()->translatedFormat('h:i A - Y/m/d'),
                    ],
                    'subscription' => [
                        'sessions_remaining' => $sessionsAfter,
                        'days_remaining'     => now()->diffInDays($subscription->end_date, false),
                        'status'             => $subscription->status,
                        'end_date'           => $subscription->end_date->toDateString(),
                    ],
                    'has_debt' => null,
                ],
            ]);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // SESSION CHECK-IN (الحصة البسيطة — بدون مبلغ)
    // ─────────────────────────────────────────────────────────────
    public function sessionCheckIn(Request $request): JsonResponse
    {
        $request->validate([
            'client_id'       => 'required|exists:clients,id',
            'session_type_id' => 'required|exists:session_types,id',
            'notes'           => 'nullable|string|max:1000',
        ]);

        return DB::transaction(function () use ($request) {
            $client      = Client::withoutGlobalScopes()->findOrFail($request->client_id);
            $sessionType = SessionType::findOrFail($request->session_type_id);

            $attendance = Attendance::create([
                'client_id'       => $client->id,
                'subscription_id' => null,
                'check_in_at'     => now(),
                'type'            => 'session',
                'sessions_before' => null,
                'sessions_after'  => null,
                'registered_by'   => auth()->id(),
                'notes'           => $request->notes ?? ('حضور حصة: ' . $sessionType->name),
            ]);

            ClientSession::create([
                'client_id'       => $client->id,
                'session_type_id' => $sessionType->id,
                'session_date'    => today(),
                'attendance_id'   => $attendance->id,
                'created_by'      => auth()->id(),
                'notes'           => $request->notes ?? null,
            ]);

            $client->update(['last_visit_at' => now()]);

            AuditLogService::log('attendance.session', 'Attendance', $attendance->id, [], $attendance->toArray());

            return response()->json([
                'success' => true,
                'status'  => 'success',
                'message' => 'تم إضافة الحصة وتسجيل الحضور ✅',
                'data'    => [
                    'client' => [
                        'id'                  => $client->id,
                        'name'                => $client->name,
                        'qr_id'               => $client->qr_id,
                        'photo_url'           => $client->photo_url,
                        'phone'               => $client->phone,
                        'total_visits_in_sub' => 0,
                        'last_visit'          => now()->translatedFormat('h:i A - Y/m/d'),
                    ],
                    'subscription' => [
                        'sessions_remaining' => null,
                        'days_remaining'     => null,
                        'status'             => 'session_only',
                        'end_date'           => null,
                    ],
                    'has_debt' => null,
                ],
            ]);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // SESSION PACKAGE CHECK-IN (بيع باقة حصص + حضور)
    // ─────────────────────────────────────────────────────────────
    public function sessionPackageCheckIn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id'            => ['required', 'exists:clients,id'],
            'session_type_id'      => ['required', 'exists:session_types,id'],
            'subscription_type_id' => ['nullable', 'exists:subscription_types,id'],
            'sessions_count'       => ['required', 'integer', 'min:1'],
            'unit_price'           => ['required', 'integer', 'min:0'],
            'discount_amount'      => ['nullable', 'integer', 'min:0'],
            'paid_amount'          => ['required', 'integer', 'min:0'],
            'notes'                => ['nullable', 'string', 'max:1000'],
        ]);

        return DB::transaction(function () use ($validated) {
            $client      = Client::findOrFail($validated['client_id']);
            $sessionType = SessionType::findOrFail($validated['session_type_id']);

            // cooldown — منع التسجيل المزدوج
            $cooldown = (int) Setting::getValue('attendance_cooldown_minutes', 240);

            $lastAttendance = Attendance::where('client_id', $client->id)
                ->where('check_in_at', '>=', now()->subMinutes($cooldown))
                ->first();

            if ($lastAttendance) {
                return response()->json([
                    'success'     => false,
                    'status'      => 'duplicate',
                    'message'     => 'سُجِّل دخول مسبقاً خلال فترة السماح.',
                    'client_id'   => $client->id,
                    'client_name' => $client->name,
                    // ✅ إزالة $subscription->id — لأنه غير موجود هنا
                ], 422);
            }

            $discountAmount  = (int) ($validated['discount_amount'] ?? 0);
            $grossAmount     = (int) $validated['unit_price'] * (int) $validated['sessions_count'];
            $totalAmount     = max(0, $grossAmount - $discountAmount);
            $paidAmount      = (int) $validated['paid_amount'];
            $remainingAmount = max(0, $totalAmount - $paidAmount);

            if ($discountAmount > $grossAmount) {
                return response()->json([
                    'success' => false,
                    'message' => 'قيمة الخصم لا يمكن أن تكون أكبر من إجمالي سعر الحصص.',
                ], 422);
            }

            if ($paidAmount > $totalAmount) {
                return response()->json([
                    'success' => false,
                    'message' => 'المبلغ المدفوع لا يمكن أن يكون أكبر من الإجمالي بعد الخصم.',
                ], 422);
            }

            $status = match (true) {
                $paidAmount === 0     => 'pending',
                $remainingAmount === 0 => 'paid',
                default               => 'partial',
            };

            $clientSession = ClientSession::create([
                'client_id'            => $client->id,
                'session_type_id'      => $sessionType->id,
                'subscription_type_id' => $validated['subscription_type_id'] ?? null,
                'sessions_count'       => $validated['sessions_count'],
                'unit_price'           => $validated['unit_price'],
                'discount_amount'      => $discountAmount,
                'total_amount'         => $totalAmount,
                'paid_amount'          => $paidAmount,
                'remaining_amount'     => $remainingAmount,
                'status'               => $status,
                'notes'                => $validated['notes'] ?? null,
                'created_by'           => auth()->id(),
            ]);

            $attendance = Attendance::create([
                'client_id'       => $client->id,
                'subscription_id' => null,
                'check_in_at'     => now(),
                'type'            => 'session',
                'sessions_before' => null,
                'sessions_after'  => null,
                'registered_by'   => auth()->id(),
                'notes'           => 'Session package check-in | client_session_id: ' . $clientSession->id,
            ]);

            $debt = Debt::where('client_id', $client->id)
                ->where('status', 'pending')
                ->orderByDesc('amount')
                ->first();

            $totalVisitsToday = Attendance::whereDate('check_in_at', today())
                ->where('client_id', $client->id)
                ->count();

            $lastVisitFormatted = $client->last_visit_at
                ? $client->last_visit_at->translatedFormat('h:i A - Y/m/d')
                : 'أول زيارة';

            $client->update(['last_visit_at' => now()]);

            AuditLogService::log(
                'attendance.session_package',
                'Attendance',
                $attendance->id,
                [],
                [
                    'attendance'     => $attendance->toArray(),
                    'client_session' => $clientSession->toArray(),
                ]
            );

            return response()->json([
                'success' => true,
                'status'  => 'success',
                'message' => 'تم بيع الحصة/الباقة وتسجيل الحضور ✅',
                'data'    => [
                    'client' => [
                        'id'                  => $client->id,
                        'name'                => $client->name,
                        'qr_id'               => $client->qr_id,
                        'photo_url'           => $client->photo_url,
                        'phone'               => $client->phone,
                        'total_visits_in_sub' => $totalVisitsToday,
                        'last_visit'          => $lastVisitFormatted,
                    ],
                    'subscription' => [
                        'sessions_remaining' => '∞',
                        'days_remaining'     => 0,
                        'status'             => 'session_package',
                        'end_date'           => null,
                    ],
                    'session_sale' => [
                        'id'               => $clientSession->id,
                        'session_type'     => $sessionType->name,
                        'sessions_count'   => $clientSession->sessions_count,
                        'unit_price'       => $clientSession->unit_price,
                        'discount_amount'  => $clientSession->discount_amount,
                        'total_amount'     => $clientSession->total_amount,
                        'paid_amount'      => $clientSession->paid_amount,
                        'remaining_amount' => $clientSession->remaining_amount,
                        'status'           => $clientSession->status,
                    ],
                    'has_debt' => $debt ? [
                        'amount'   => $debt->amount,
                        'reason'   => $debt->reason,
                        'due_date' => $debt->due_date,
                    ] : null,
                ],
            ]);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // TODAY
    // ─────────────────────────────────────────────────────────────
    public function today(): JsonResponse
    {
        $records = Attendance::with(['client:id,name,photo_url,qr_id'])
            ->whereDate('check_in_at', today())
            ->latest('check_in_at')
            ->get();

        return response()->json([
            'data'  => $records,
            'count' => $records->count(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // MANUAL REMINDER
    // ─────────────────────────────────────────────────────────────
    public function manualReminder(ClientSubscription $subscription): JsonResponse
    {
        $client = $subscription->client;

        if (! $client || ! $client->phone) {
            return response()->json([
                'message' => 'لا يوجد رقم موبايل صالح لهذا العميل.',
            ], 422);
        }

        $daysRemaining = $subscription->days_remaining;

        if ($subscription->end_date < now()->toDateString() || $daysRemaining <= 3) {
            $this->maybeDispatchExpiryReminder($subscription);

            $subscription->update([
                'manual_notified_at' => now(),
                'manual_notified_by' => auth()->id(),
            ]);

            return response()->json([
                'message' => 'تم إرسال تذكير قرب/انتهاء الاشتراك للعميل.',
            ]);
        }

        if (! is_null($subscription->sessions_remaining) && $subscription->sessions_remaining <= 1) {
            $this->maybeDispatchSessionsAlert($subscription);

            $subscription->update([
                'manual_notified_at' => now(),
                'manual_notified_by' => auth()->id(),
            ]);

            return response()->json([
                'message' => 'تم إرسال تذكير بنفاد الحصص للعميل.',
            ]);
        }

        return response()->json([
            'message' => 'هذا الاشتراك ليس قريباً من الانتهاء ولا الحصص على وشك النفاد.',
        ], 422);
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE — Expiry Reminder
    // ─────────────────────────────────────────────────────────────
    private function maybeDispatchExpiryReminder(ClientSubscription $subscription): void
    {
        // ✅ type hint صريح ClientSubscription — يمنع تمرير Attendance بالغلط
        if ($subscription->status !== 'active') {
            return;
        }

        $client = $subscription->client;
        if (! $client || ! $client->phone) {
            return;
        }

        $alreadySentToday = WhatsappLog::where('client_id', $client->id)
            ->where('template_type', 'expiry_reminder')
            ->whereDate('created_at', today())
            ->exists();

        if ($alreadySentToday) {
            return;
        }

        SendExpiryReminder::dispatch($subscription);
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE — Sessions Alert
    // ─────────────────────────────────────────────────────────────
    private function maybeDispatchSessionsAlert(ClientSubscription $subscription): void
    {
        // ✅ type hint صريح ClientSubscription — يمنع تمرير Attendance بالغلط
        $client = $subscription->client;
        if (! $client || ! $client->phone) {
            return;
        }

        $alreadySentToday = WhatsappLog::where('client_id', $client->id)
            ->where('template_type', 'sessions_empty')
            ->whereDate('created_at', today())
            ->exists();

        if ($alreadySentToday) {
            return;
        }

        SendSessionsAlert::dispatch($subscription);
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE — Block Notification (manual method)
    // ─────────────────────────────────────────────────────────────
    private function sendAttendanceBlockNotification(
        Client $client,
        string $templateType,
        array $variables
    ): void {
        if (! $client->phone) {
            return;
        }

        $template = WhatsappTemplate::where('type', $templateType)
            ->where('enabled', true)
            ->first();

        if (! $template) {
            return;
        }

        $phone = WhatsAppService::normalizePhone($client->phone);

        if (! $phone) {
            return;
        }

        $alreadySentToday = WhatsappLog::where('client_id', $client->id)
            ->where('template_type', $templateType)
            ->whereDate('created_at', today())
            ->exists();

        if ($alreadySentToday) {
            return;
        }

        $log = WhatsappLog::create([
            'client_id'       => $client->id,
            'template_type'   => $templateType,
            'message_content' => $template->render($variables),
            'phone_number'    => $phone,
            'status'          => 'pending',
        ]);

        SendWhatsAppMessage::dispatch($log);
    }
}
