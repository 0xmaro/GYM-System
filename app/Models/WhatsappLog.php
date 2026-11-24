<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappLog extends Model
{
    public const UPDATED_AT = null;
    protected $fillable = ['client_id', 'template_type', 'message_content', 'phone_number', 'status', 'sent_at', 'error_message'];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
