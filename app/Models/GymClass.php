<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GymClass extends Model
{
    protected $table = 'classes';

    protected $fillable = [
        'name',
        'type',
        'captain_id',
        'schedule',
        'duration_minutes',
        'capacity',
        'is_active',
    ];

    protected $casts = [
        'schedule' => 'array',
        'is_active' => 'boolean',
        'duration_minutes' => 'integer',
        'capacity' => 'integer',
    ];

    public function captain()
    {
        return $this->belongsTo(User::class, 'captain_id');
    }
}
