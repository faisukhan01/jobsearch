<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\DigestController;

/*
|--------------------------------------------------------------------------
| JobPilot Notification API
|--------------------------------------------------------------------------
| Consumed by the Next.js BFF after meaningful pipeline changes.
| All routes expect a shared secret in the X-JobPilot-Signature header.
*/

Route::get('/health', fn () => response()->json([
    'service' => 'jobpilot-notifications',
    'framework' => 'laravel',
    'version' => app()->version(),
    'status' => 'ok',
    'channels' => ['email', 'slack', 'webhook'],
]));

Route::middleware('jobpilot.signature')->group(function () {
    // Fired by Next.js when an application changes pipeline stage
    Route::post('/webhooks/application-status', [WebhookController::class, 'applicationStatus']);

    // Fired by the FastAPI engine after an autopilot tick
    Route::post('/webhooks/autopilot-tick', [WebhookController::class, 'autopilotTick']);

    // Daily/weekly digest — POST { email, range: 'daily'|'weekly' }
    Route::post('/digest/send', [DigestController::class, 'send']);
});
