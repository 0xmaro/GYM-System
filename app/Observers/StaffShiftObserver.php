<?php

namespace App\Observers;

use App\Models\StaffShift;
use App\Services\AuditLogService;
use App\Events\ShiftCashMismatch;

class StaffShiftObserver
{
    public function created(StaffShift $shift): void
    {
        AuditLogService::log('shift.opened', 'StaffShift', $shift->id, [], $shift->toArray());
    }

    public function updated(StaffShift $shift): void
    {
        if ($shift->wasChanged('status') && $shift->status === 'closed') {
            AuditLogService::log('shift.closed', 'StaffShift', $shift->id, $shift->getOriginal(), $shift->getChanges());

            // إطلاق تنبيه للأدمن إذا كان هناك عجز أو زيادة في النقدية
            if ($shift->cash_difference != 0) {
                broadcast(new ShiftCashMismatch($shift))->toOthers();
            }
        }
    }
}
