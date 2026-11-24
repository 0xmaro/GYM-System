<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SessionType extends Model
{
    protected $fillable = [
        'name',
        'default_price',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'default_price' => 'integer',
        'is_active' => 'boolean',
    ];

    public function clientSessions()
    {
        return $this->hasMany(ClientSession::class);
    }
}
