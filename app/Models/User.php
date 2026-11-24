<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name', 'phone', 'email', 'password',
        'role', 'gender_access', 'permissions',
        'is_active', 'device_fingerprint', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'permissions'    => 'array',
        'is_active'      => 'boolean',
        'last_login_at'  => 'datetime',
    ];

    // ─── Relationships ───────────────────────────────────────
    public function shifts()
    {
        return $this->hasMany(StaffShift::class, 'staff_id');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    // ─── Role Helpers ─────────────────────────────────────────
    public function isAdmin(): bool     { return $this->role === 'admin'; }
    public function isCaptain(): bool   { return $this->role === 'captain'; }
    public function isReception(): bool { return $this->role === 'reception'; }

    public function hasPermission(string $permission): bool
    {
        if ($this->isAdmin()) return true;
        return in_array($permission, $this->permissions ?? []);
    }
}
