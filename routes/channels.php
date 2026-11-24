<?php

use Illuminate\Support\Facades\Broadcast;

// قناة الحضور اليومي — مفتوحة للمصادقين
Broadcast::channel('attendance.{date}', function ($user, $date) {
    return auth()->check();
});

// قناة إشعارات الأدمن
Broadcast::channel('admin.notifications', function ($user) {
    return $user->role === 'admin';
});
