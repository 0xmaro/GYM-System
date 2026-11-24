<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionType extends Model
{
    protected $fillable = [
        'name',
        'label',
        'price',
        'duration_type',
        'price_monthly',
        'price_3months',
        'price_6months',
        'session_price',
        'sessions_count',
        'duration_days',
        'max_freeze_days',
        'is_active',
    ];

    protected $casts = [
        'is_active'       => 'boolean',
        'sessions_count'  => 'integer',
        'duration_days'   => 'integer',
        'max_freeze_days' => 'integer',
        'price'           => 'integer',
        'price_monthly'   => 'integer',
        'price_3months'   => 'integer',
        'price_6months'   => 'integer',
        'session_price'   => 'integer',
    ];

    public function subscriptions()
    {
        return $this->hasMany(ClientSubscription::class);
    }

    public function clientSessions()
    {
        return $this->hasMany(ClientSession::class);
    }
}
