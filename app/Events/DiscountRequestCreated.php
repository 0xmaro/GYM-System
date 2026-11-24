<?php

namespace App\Events;

use App\Models\DiscountRequest;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DiscountRequestCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public DiscountRequest $discountRequest) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('admin.notifications'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'discount.requested';
    }

    public function broadcastWith(): array
    {
        return [
            'id'               => $this->discountRequest->id,
            'client_id'        => $this->discountRequest->client_id,
            'original_amount'  => $this->discountRequest->original_amount,
            'requested_amount' => $this->discountRequest->requested_amount,
            'reason'           => $this->discountRequest->reason,
            'requested_by'     => $this->discountRequest->requested_by,
            'created_at'       => $this->discountRequest->created_at?->toDateTimeString(),
        ];
    }
}
