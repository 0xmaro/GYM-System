<?php
// routes/console.php

use Illuminate\Support\Facades\Schedule;

// النسخ الاحتياطي
Schedule::command('backup:run')->dailyAt('02:00');
Schedule::command('backup:clean')->dailyAt('02:30');
Schedule::command('whatsapp:send-scheduled')->dailyAt('09:00');
// المراقبة
Schedule::command('gymos:monitor-whatsapp')->everyFiveMinutes();
Schedule::command('gymos:monitor-queues')->everyFiveMinutes();
