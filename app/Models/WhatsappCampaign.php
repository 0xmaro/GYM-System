<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappCampaign extends Model
{
    protected $fillable = [
        'name','message','target_filters','recipients_count',
        'status','scheduled_at','started_at','finished_at',
        'sent_count','failed_count','created_by',
    ];

    protected $casts = [
        'target_filters' => 'array',
        'scheduled_at'   => 'datetime',
        'started_at'     => 'datetime',
        'finished_at'    => 'datetime',
    ];

    public function creator() { return $this->belongsTo(User::class, 'created_by'); }

    public function getProgressAttribute(): int
    {
        if ($this->recipients_count === 0) return 0;
        return (int) round((($this->sent_count + $this->failed_count) / $this->recipients_count) * 100);
    }

    // جيب الـ clients المستهدفين بناءً على الـ filters
    public function resolveRecipients(): \Illuminate\Support\Collection
    {
        $filters = $this->target_filters ?? [];
        $query   = Client::whereNotNull('phone');

        if (!empty($filters['status'])) {
            $query->where('subscription_status', $filters['status']);
        }
        if (!empty($filters['gender'])) {
            $query->where('gender', $filters['gender']);
        }
        if (!empty($filters['subscription_type_id'])) {
            $query->where('subscription_type_id', $filters['subscription_type_id']);
        }

        return $query->get(['id', 'name', 'phone']);
    }
}
