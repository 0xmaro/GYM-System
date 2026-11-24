<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckGymAccess
{
    public function handle(Request $request, Closure $next, string $gender): mixed
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // admin شايف كل حاجة
        if ($user->isAdmin()) return $next($request);

        if ($user->gender_access !== 'both' && $user->gender_access !== $gender) {
            return response()->json([
                'message' => 'Access denied for this gym section',
            ], 403);
        }

        return $next($request);
    }
}
