<?php

/**
 * JobPilot Notification Service — Laravel 11 slim bootstrap.
 *
 * Role inside the platform architecture:
 *   Next.js (BFF)  ──►  FastAPI engine  ──►  THIS service (HTTP webhooks)
 *                                            ├─ email digests (Application status changes)
 *                                            ├─ Slack/Telegram pings (offers, interviews)
 *                                            └─ calendar invites (interview scheduling)
 *
 * Run anywhere PHP 8.2+ exists:
 *   composer install
 *   php artisan serve --host=0.0.0.0 --port=8080
 */

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(prevent: false);
        $middleware->throttleApi('120,1');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
