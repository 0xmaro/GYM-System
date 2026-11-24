<?php

namespace App\Events;

use App\Models\StaffShift;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShiftCashMismatch
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $shift;

    /**
     * Create a new event instance.
     */
    public function __construct(StaffShift $shift)
    {
        $this->shift = $shift;
    }
}
