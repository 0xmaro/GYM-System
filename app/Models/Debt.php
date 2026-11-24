<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Debt extends Model
{
    protected $fillable = [
        'client_id', 'amount', 'reason',
        'due_date', 'status', 'paid_at', 'notified_at',
    ];

    protected $casts = [
        'due_date'     => 'date',
        'paid_at'      => 'datetime',
        'notified_at'  => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
