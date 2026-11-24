<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaffShift extends Model
{
    protected $fillable = [
        'staff_id', 'start_time', 'end_time',
        'opening_cash', 'expected_cash', 'actual_cash',
        'cash_difference', 'difference_note',
        'total_subscriptions', 'total_sessions_registered',
        'status', 'handover_to',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time'   => 'datetime',
    ];

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function handoverTo()
    {
        return $this->belongsTo(User::class, 'handover_to');
    }
}
