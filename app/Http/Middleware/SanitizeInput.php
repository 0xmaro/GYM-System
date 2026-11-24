<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SanitizeInput
{
    protected array $except = [
        'notes',
        'message_content',
        'password',
        'password_confirmation'
    ];

    public function handle(Request $request, Closure $next)
    {
        if ($request->isMethod('POST') || $request->isMethod('PUT') || $request->isMethod('PATCH')) {
            $input = $request->all();
            array_walk_recursive($input, function (&$value, $key) {
                if (is_string($value) && !in_array($key, $this->except)) {
                    $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
                }
            });
            $request->merge($input);
        }

        return $next($request);
    }
}
