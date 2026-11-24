<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Client;
use App\Models\ClientSubscription;
use App\Models\Setting;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;

class ClientProfileController extends Controller
{
    public function show(Client $client): JsonResponse
    {
        $client->load([
            'activeSubscription.subscriptionType',
            'subscriptions.subscriptionType',
            'debts',
            'qrCard',
        ]);

        $subscriptions = $client->subscriptions()
            ->with('subscriptionType')
            ->latest('created_at')
            ->get()
            ->map(function ($subscription) {
                $attendanceCount = Attendance::where('subscription_id', $subscription->id)->count();
                $lastAttendance = Attendance::where('subscription_id', $subscription->id)
                    ->latest('check_in_at')
                    ->first();

                $transaction = Transaction::where('subscription_id', $subscription->id)
                    ->where('type', 'income')
                    ->latest('created_at')
                    ->first();

                $daysRemaining = now()->startOfDay()->diffInDays($subscription->end_date, false);

                return [
                    'id' => $subscription->id,
                    'status' => $subscription->status,
                    'start_date' => optional($subscription->start_date)->toDateString(),
                    'end_date' => optional($subscription->end_date)->toDateString(),
                    'original_end_date' => optional($subscription->original_end_date)->toDateString(),
                    'sessions_remaining' => $subscription->sessions_remaining,
                    'amount_paid' => (int) $subscription->amount_paid,
                    'discount_amount' => (int) $subscription->discount_amount,
                    'discount_reason' => $subscription->discount_reason,
                    'freeze_days_count' => (int) $subscription->freeze_days_count,
                    'freeze_reason' => $subscription->freeze_reason,
                    'frozen_until' => optional($subscription->frozen_until)->toDateString(),
                    'created_at' => optional($subscription->created_at)?->toDateTimeString(),
                    'days_remaining' => $daysRemaining,
                    'attendance_count' => $attendanceCount,
                    'last_attendance_at' => optional($lastAttendance?->check_in_at)?->toDateTimeString(),
                    'subscription_type' => [
                        'id' => $subscription->subscriptionType?->id,
                        'name' => $subscription->subscriptionType?->name,
                        'label' => $subscription->subscriptionType?->label,
                        'duration_days' => $subscription->subscriptionType?->duration_days,
                        'sessions_count' => $subscription->subscriptionType?->sessions_count,
                        'price' => (int) ($subscription->subscriptionType?->price ?? 0),
                    ],
                    'transaction' => $transaction ? [
                        'id' => $transaction->id,
                        'amount' => (int) $transaction->amount,
                        'payment_method' => $transaction->payment_method,
                        'created_at' => optional($transaction->created_at)?->toDateTimeString(),
                        'notes' => $transaction->notes,
                    ] : null,
                ];
            })
            ->values();

        $attendanceRecords = Attendance::where('client_id', $client->id)
            ->latest('check_in_at')
            ->limit(50)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'subscription_id' => $row->subscription_id,
                'check_in_at' => optional($row->check_in_at)?->toDateTimeString(),
                'type' => $row->type,
                'class_type' => $row->class_type,
                'sessions_before' => $row->sessions_before,
                'sessions_after' => $row->sessions_after,
                'registered_by' => $row->registered_by,
                'notes' => $row->notes,
            ])
            ->values();

        return response()->json([
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'phone' => $client->phone,
                'qr_id' => $client->qr_id,
                'gender' => $client->gender,
                'age' => $client->age,
                'address' => $client->address,
                'photo_url' => $client->photo_url,
                'status' => $client->status,
                'notes' => $client->notes,
                'last_visit_at' => optional($client->last_visit_at)?->toDateTimeString(),
                'created_at' => optional($client->created_at)?->toDateTimeString(),
            ],
            'summary' => [
                'attendance_count' => Attendance::where('client_id', $client->id)->count(),
                'active_debts_count' => $client->debts->where('status', 'pending')->count(),
                'active_debts_total' => (int) $client->debts->where('status', 'pending')->sum('amount'),
                'subscriptions_count' => $client->subscriptions->count(),
            ],
            'subscriptions' => $subscriptions,
            'attendance' => $attendanceRecords,
            'debts' => $client->debts->map(fn ($debt) => [
                'id' => $debt->id,
                'amount' => (int) $debt->amount,
                'reason' => $debt->reason,
                'due_date' => optional($debt->due_date)?->toDateString(),
                'status' => $debt->status,
                'paid_at' => optional($debt->paid_at)?->toDateTimeString(),
                'created_at' => optional($debt->created_at)?->toDateTimeString(),
            ])->values(),
        ]);
    }

    public function subscriptionContract(Client $client, ClientSubscription $subscription): JsonResponse
    {
        abort_if($subscription->client_id !== $client->id, 404);

        $subscription->load(['client', 'subscriptionType']);

        $attendanceCount = Attendance::where('subscription_id', $subscription->id)->count();
        $lastAttendance = Attendance::where('subscription_id', $subscription->id)
            ->latest('check_in_at')
            ->first();

        $transaction = Transaction::where('subscription_id', $subscription->id)
            ->where('type', 'income')
            ->latest('created_at')
            ->first();

        $daysRemaining = now()->startOfDay()->diffInDays($subscription->end_date, false);

        return response()->json([
            'contract' => [
                'gym' => [
                    'name' => 'My Gym',
                    'manager' => 'الكابتن ايهاب',
                    'phone' => '01116485054',
                    'logo_path' => 'resources/js/pages/clients/logomygym.png',
                ],
                'client' => [
                    'id' => $client->id,
                    'name' => $client->name,
                    'phone' => $client->phone,
                    'gender' => $client->gender,
                    'age' => $client->age,
                    'address' => $client->address,
                    'qr_id' => $client->qr_id,
                ],
                'subscription' => [
                    'id' => $subscription->id,
                    'status' => $subscription->status,
                    'start_date' => optional($subscription->start_date)->toDateString(),
                    'end_date' => optional($subscription->end_date)->toDateString(),
                    'original_end_date' => optional($subscription->original_end_date)->toDateString(),
                    'days_remaining' => $daysRemaining,
                    'sessions_remaining' => $subscription->sessions_remaining,
                    'amount_paid' => (int) $subscription->amount_paid,
                    'discount_amount' => (int) $subscription->discount_amount,
                    'discount_reason' => $subscription->discount_reason,
                    'freeze_days_count' => (int) $subscription->freeze_days_count,
                    'freeze_reason' => $subscription->freeze_reason,
                    'frozen_until' => optional($subscription->frozen_until)->toDateString(),
                ],
                'plan' => [
                    'id' => $subscription->subscriptionType?->id,
                    'name' => $subscription->subscriptionType?->name,
                    'label' => $subscription->subscriptionType?->label,
                    'duration_days' => $subscription->subscriptionType?->duration_days,
                    'sessions_count' => $subscription->subscriptionType?->sessions_count,
                    'price' => (int) ($subscription->subscriptionType?->price ?? 0),
                ],
                'attendance' => [
                    'total_visits' => $attendanceCount,
                    'last_visit_at' => optional($lastAttendance?->check_in_at)?->toDateTimeString(),
                ],
                'payment' => $transaction ? [
                    'amount' => (int) $transaction->amount,
                    'payment_method' => $transaction->payment_method,
                    'created_at' => optional($transaction->created_at)?->toDateTimeString(),
                    'notes' => $transaction->notes,
                ] : null,
                'issued_at' => now()->toDateTimeString(),
            ]
        ]);
    }
}
