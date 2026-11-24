<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiscountRequest extends Model
{
    protected $fillable = [
        'client_id',
        'subscription_type_id',
        'requested_by',
        'original_amount',
        'requested_amount',
        'reason',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_note',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function subscriptionType()
    {
        return $this->belongsTo(SubscriptionType::class);
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewedBy()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
