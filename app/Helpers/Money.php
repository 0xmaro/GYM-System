<?php

namespace App\Helpers;

class Money
{
    /**
     * تحويل القروش → ج.م للعرض
     * المثال: 15000 → "150.00 ج.م"
     */
    public static function format(int $piasters): string
    {
        $config   = config('gymos.currency');
        $amount   = $piasters / $config['divisor'];
        $decimals = $config['decimals'];
        $symbol   = $config['symbol'];

        return number_format($amount, $decimals) . ' ' . $symbol;
    }

    /**
     * تحويل ج.م → قروش للتخزين
     * المثال: 150 → 15000
     */
    public static function toPiasters(float $amount): int
    {
        return (int) round($amount * config('gymos.currency.divisor'));
    }
}
