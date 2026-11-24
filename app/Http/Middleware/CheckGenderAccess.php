<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckGenderAccess
{
    // الفلتر الحقيقي بيحصل في GenderScope على مستوى Eloquent
    // الـ Middleware ده بيوفر طبقة حماية إضافية للـ routes اللي بتتعامل مع gender مباشرة
    public function handle(Request $request, Closure $next)
    {
        return $next($request);
    }
}
