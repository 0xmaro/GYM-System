<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attendance extends Model
{
    use SoftDeletes;
    protected $table = 'attendance'; // ← أضف هذا السطر

    protected $fillable = [
        'client_id', 'subscription_id', 'check_in_at',
        'type', 'class_type',
        'sessions_before', 'sessions_after',
        'registered_by', 'notes',
    ];

    protected $casts = [
        'check_in_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function subscription()
    {
        return $this->belongsTo(ClientSubscription::class, 'subscription_id');
    }

    public function registeredBy()
    {
        return $this->belongsTo(User::class, 'registered_by');
    }
}
