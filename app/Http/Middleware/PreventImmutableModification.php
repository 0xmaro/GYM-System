<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PreventImmutableModification
{
    public function handle(Request $request, Closure $next): Response
    {
        $restrictedMethods = ['PUT', 'PATCH', 'DELETE'];

        if (in_array($request->method(), $restrictedMethods)) {
            // منع التعديل على سجلات الأحداث والمعاملات المالية
            if ($request->is('api/v1/audit-logs/*') || $request->is('api/v1/transactions/*')) {
                return response()->json([
                    'message' => 'غير مسموح بتعديل أو حذف هذه السجلات (Immutable).'
                ], 405);
            }
        }

        return $next($request);
    }
}
