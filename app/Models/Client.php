<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory; // أضف السطر ده فوق
use App\Models\Scopes\GenderScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use SoftDeletes;
use HasFactory; // وأضف السطر ده هنا
    protected $fillable = [
        'qr_id', 'name', 'phone', 'age', 'address',
        'gender', 'photo_url', 'status', 'notes', 'last_visit_at',
    ];

    protected $casts = [
        'last_visit_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new GenderScope());
    }

    public function subscriptions()
    {
        return $this->hasMany(ClientSubscription::class);
    }

public function activeSubscription()
{
    // بنجيب آخر اشتراك (سواء نشط أو مجمّد) عشان يظهر في البروفايل
    return $this->hasOne(ClientSubscription::class)
                ->whereIn('status', ['active', 'frozen'])
                ->latestOfMany();
}

    public function attendance()
    {
        return $this->hasMany(Attendance::class);
    }

    public function qrCard()
    {
        return $this->hasOne(QrCard::class, 'client_id');
    }

    public function debts()
    {
        return $this->hasMany(Debt::class);
    }

    public function whatsappLogs()
    {
        return $this->hasMany(WhatsappLog::class);
    }
}
