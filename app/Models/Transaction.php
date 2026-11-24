<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $fillable = [
        'type', 'category', 'amount',
        'client_id', 'subscription_id',
        'payment_method', 'cashier_id', 'shift_id',
        'receipt_url', 'notes',
    ];

    const UPDATED_AT = null;

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function shift()
    {
        return $this->belongsTo(StaffShift::class, 'shift_id');
    }
}
