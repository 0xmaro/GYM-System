<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role'   => \App\Http\Middleware\CheckRole::class,
            'gender' => \App\Http\Middleware\CheckGenderAccess::class,
        ]);
    $middleware->api(prepend: [
        \App\Http\Middleware\ForceJsonResponse::class,
    ]);
$middleware->api(append: [
    \App\Http\Middleware\SecurityHeaders::class,
    \App\Http\Middleware\SanitizeInput::class,
    \App\Http\Middleware\PreventImmutableModification::class,
]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
