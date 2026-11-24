<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientSession extends Model
{
    protected $fillable = [
        'client_id',
        'session_type_id',
        'subscription_type_id',
        'sessions_count',
        'unit_price',
        'discount_amount',
        'total_amount',
        'paid_amount',
        'remaining_amount',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'sessions_count' => 'integer',
        'unit_price' => 'integer',
        'discount_amount' => 'integer',
        'total_amount' => 'integer',
        'paid_amount' => 'integer',
        'remaining_amount' => 'integer',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function sessionType()
    {
        return $this->belongsTo(SessionType::class);
    }

    public function subscriptionType()
    {
        return $this->belongsTo(SubscriptionType::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
