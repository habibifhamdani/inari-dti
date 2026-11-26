<?php

use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureNotFullBanned;
use App\Http\Middleware\EnsureSuperadmin;
use App\Http\Middleware\EvaluateEditionTransitions;
use App\Http\Middleware\ResolveOptionalSanctumUser;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'admin' => EnsureAdmin::class,
            'superadmin' => EnsureSuperadmin::class,
            'dti.transitions' => EvaluateEditionTransitions::class,
            'not.banned' => EnsureNotFullBanned::class,
            'sanctum.optional' => ResolveOptionalSanctumUser::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
