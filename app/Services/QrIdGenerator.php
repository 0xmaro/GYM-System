<?php

namespace App\Services;

use App\Models\QrCard;
use Illuminate\Support\Facades\DB;

class QrIdGenerator
{
    /**
     * يجيب أول QR Card متاحة بالـ Lock لمنع race condition
     */
    public static function getAvailable(): string
    {
        $card = QrCard::where('status', 'available')
                      ->lockForUpdate()
                      ->first();

        if (!$card) {
            throw new \RuntimeException('لا توجد كروت QR متاحة. يرجى إضافة كروت جديدة.');
        }

        return $card->qr_id;
    }
}
