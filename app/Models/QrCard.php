<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class QrCard extends Model
{
    protected $fillable = [
        'qr_id',
        'client_id',
        'last_client_id',
        'status',
        'issued_at',
        'returned_at',
        'lost_at',
        'damaged_at',
        'cancelled_at',
        'replaced_by',
        'replacement_reason',
        'notes',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'returned_at' => 'datetime',
        'lost_at' => 'datetime',
        'damaged_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function lastClient()
    {
        return $this->belongsTo(Client::class, 'last_client_id');
    }

    public function replacedByCard()
    {
        return $this->belongsTo(QrCard::class, 'replaced_by');
    }

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('status', 'available');
    }

    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where(function ($q) use ($term) {
            $q->where('qr_id', 'like', "%{$term}%")
              ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$term}%"))
              ->orWhereHas('lastClient', fn ($c) => $c->where('name', 'like', "%{$term}%"));
        });
    }

    public function isAvailable(): bool
    {
        return $this->status === 'available';
    }

    public function isUsable(): bool
    {
        return in_array($this->status, ['available', 'returned']);
    }
}
