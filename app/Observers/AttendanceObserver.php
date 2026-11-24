<?php

namespace App\Observers;

use App\Models\Attendance;
use App\Services\AuditLogService;
use App\Jobs\SendSessionsAlert;

class AttendanceObserver
{
    public function created(Attendance $attendance): void
    {
        AuditLogService::log('attendance.recorded', 'Attendance', $attendance->id, [], $attendance->toArray());

        // إطلاق تنبيه نفاد الحصص لو الحصص المتبقية بقت صفر أو واحد
        if (! is_null($attendance->sessions_after) && $attendance->sessions_after <= 1) {
            // ✅ نجيب الـ subscription من الـ attendance بدل ما نبعت الـ attendance نفسه
            $subscription = $attendance->subscription;

            if ($subscription) {
                SendSessionsAlert::dispatch($subscription);
            }
        }
    }
}
