<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ClientResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'         => $this->id,
            'qr_id'      => $this->qr_id,
            'name'       => $this->name,
            'phone'      => $this->phone,
            'age'        => $this->age,
            'address'    => $this->address,
            'gender'     => $this->gender,
            'photo_url'  => $this->photo_url,
            'status'     => $this->status,
            'notes'      => $this->notes,
            'created_at' => $this->created_at?->toDateString(),

            // ✅ الاتنين معاً: ISO للفرز + human للعرض
            'last_visit_at'       => $this->last_visit_at?->toIso8601String(),
            'last_visit_at_human' => $this->last_visit_at?->diffForHumans(),

            // ✅ whenLoaded يمنع N+1 في الـ index
            'active_subscription' => $this->whenLoaded(
                'activeSubscription',
                fn($activeSub) => [
                    'id'                 => $activeSub->id,
                    'start_date'         => $activeSub->start_date?->toDateString(),
                    'end_date'           => $activeSub->end_date?->toDateString(),
                    'original_end_date'  => $activeSub->original_end_date?->toDateString(),
                    'sessions_remaining' => $activeSub->sessions_remaining,
                    'status'             => $activeSub->status,
                    'frozen_at'          => $activeSub->frozen_at?->toDateString(),
                    'frozen_until'       => $activeSub->frozen_until?->toDateString(),
                    'freeze_days_count'  => $activeSub->freeze_days_count ?? 0,
                    'freeze_reason'      => $activeSub->freeze_reason,
                    // ✅ amount_paid بدون / 100 (لو مش بتخزن cents)
                    'amount_paid'        => (float) $activeSub->amount_paid,
                    'amount_paid_formatted' => number_format($activeSub->amount_paid, 2) . ' ج.م',
                    'discount_amount'    => (float) ($activeSub->discount_amount ?? 0),
                    'subscription_type'  => $activeSub->relationLoaded('subscriptionType')
                        ? [
                            'id'            => $activeSub->subscriptionType?->id,
                            'name'          => $activeSub->subscriptionType?->name ?? 'باقة نشطة',
                            'duration_days' => $activeSub->subscriptionType?->duration_days,
                            'sessions_count'=> $activeSub->subscriptionType?->sessions_count,
                        ]
                        : null,
                ]
            ),

            // ✅ subscriptions history — بيانات أكمل
            'subscriptions' => $this->whenLoaded(
                'subscriptions',
                fn() => $this->subscriptions->map(fn($s) => [
                    'id'                 => $s->id,
                    'type'               => $s->subscriptionType?->name,
                    'type_id'            => $s->subscription_type_id,
                    'start_date'         => $s->start_date?->toDateString(),
                    'end_date'           => $s->end_date?->toDateString(),
                    'status'             => $s->status,
                    'sessions_remaining' => $s->sessions_remaining,
                    'amount_paid'        => (float) $s->amount_paid,
                    'frozen_until'       => $s->frozen_until?->toDateString(),
                    'freeze_days_count'  => $s->freeze_days_count ?? 0,
                    'created_at'         => $s->created_at?->toDateString(),
                ])
            ),

            // ✅ qrCard
            'qr_card' => $this->whenLoaded(
                'qrCard',
                fn($card) => $card ? [
                    'qr_id'  => $card->qr_id,
                    'status' => $card->status,
                ] : null
            ),

            // ✅ debts — كان محمّل في show() لكن مش موجود في الـ Resource
            'debts' => $this->whenLoaded(
                'debts',
                fn() => $this->debts->map(fn($d) => [
                    'id'          => $d->id,
                    'amount'      => (float) $d->amount,
                    'description' => $d->description,
                    'status'      => $d->status,
                    'created_at'  => $d->created_at?->toDateString(),
                ])
            ),
        ];
    }
}
