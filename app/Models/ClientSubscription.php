<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClientSubscription extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'client_id',
        'subscription_type_id',
        'start_date',
        'end_date',
        'original_end_date',
        'sessions_remaining',
        'amount_paid',
        'discount_amount',
        'discount_reason',
        'discount_approved_by',
        'status',
        'last_notified_at',
        'manual_notified_at',
        'manual_notified_by',
        'frozen_at',
        'frozen_until',
        'freeze_days_count',
        'freeze_reason',
        'created_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'original_end_date' => 'date',
        'last_notified_at' => 'datetime',
        'manual_notified_at' => 'datetime',
        'frozen_at' => 'datetime',
        'frozen_until' => 'date',
    ];

    public function isActive(): bool
    {
        return $this->status === 'active' && $this->end_date >= now()->toDateString();
    }

    public function isUnlimited(): bool
    {
        return is_null($this->sessions_remaining);
    }

    public function getDaysRemainingAttribute(): int
    {
        return max(0, now()->diffInDays($this->end_date, false));
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function subscriptionType()
    {
        return $this->belongsTo(SubscriptionType::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function discountApprovedBy()
    {
        return $this->belongsTo(User::class, 'discount_approved_by');
    }

    public function manualNotifiedBy()
    {
        return $this->belongsTo(User::class, 'manual_notified_by');
    }
}
