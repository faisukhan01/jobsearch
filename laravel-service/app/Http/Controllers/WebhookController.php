<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Notification;
use App\Notifications\ApplicationStatusChanged;
use App\Notifications\AutopilotTickSummary;

/**
 * Receives signed webhooks from the Next.js BFF / FastAPI engine and fans
 * notifications out to the configured channels (email, Slack, generic
 * webhooks). Swap the Notification classes for real channel routing via
 * config/services.php in production.
 */
class WebhookController extends Controller
{
    public function applicationStatus(): JsonResponse
    {
        $data = request()->validate([
            'applicationId' => ['required', 'string'],
            'jobTitle'      => ['required', 'string', 'max:200'],
            'company'       => ['required', 'string', 'max:120'],
            'status'        => ['required', 'in:queued,applied,screening,interview,offer,rejected,withdrawn'],
            'recipient'     => ['required', 'email'],
        ]);

        Notification::route('mail', $data['recipient'])
            ->notify(new ApplicationStatusChanged(
                jobTitle: $data['jobTitle'],
                company: $data['company'],
                status: $data['status'],
                applicationId: $data['applicationId'],
            ));

        return response()->json([
            'ok' => true,
            'dispatched' => 'application_status_changed',
            'status' => $data['status'],
        ]);
    }

    public function autopilotTick(): JsonResponse
    {
        $data = request()->validate([
            'applied'    => ['required', 'integer', 'min:0'],
            'dailyLimit' => ['required', 'integer', 'min:1'],
            'summary'    => ['required', 'array'],
            'recipient'  => ['required', 'email'],
        ]);

        Notification::route('mail', $data['recipient'])
            ->notify(new AutopilotTickSummary(
                applied: $data['applied'],
                dailyLimit: $data['dailyLimit'],
                summary: $data['summary'],
            ));

        return response()->json([
            'ok' => true,
            'dispatched' => 'autopilot_tick_summary',
        ]);
    }
}
