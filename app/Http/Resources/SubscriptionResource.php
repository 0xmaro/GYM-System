<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                   => $this->id,
            'client_id'            => $this->client_id,
            'subscription_type'    => $this->whenLoaded('subscriptionType', fn() => [
                'id'   => $this->subscriptionType->id,
                'name' => $this->subscriptionType->name,
            ]),
            'start_date'           => $this->start_date?->toDateString(),
            'end_date'             => $this->end_date?->toDateString(),
            'original_end_date'    => $this->original_end_date?->toDateString(),
            'sessions_remaining'   => $this->sessions_remaining,
            'amount_paid'          => $this->amount_paid,
            'amount_paid_display'  => number_format($this->amount_paid / 100, 2) . ' ج.م',
            'discount_amount'      => $this->discount_amount,
            'discount_display'     => number_format($this->discount_amount / 100, 2) . ' ج.م',
            'status'               => $this->status,
            'frozen_at'            => $this->frozen_at?->toDateTimeString(),
            'frozen_until'         => $this->frozen_until?->toDateString(),
            'freeze_days_count'    => $this->freeze_days_count,
            'days_remaining'       => $this->end_date ? now()->diffInDays($this->end_date, false) : null,
            'created_at'           => $this->created_at->toDateString(),
        ];
    }
}
