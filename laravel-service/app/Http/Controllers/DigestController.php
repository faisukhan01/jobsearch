<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Notification;
use App\Notifications\PipelineDigest;

class DigestController extends Controller
{
    public function send(): JsonResponse
    {
        $data = request()->validate([
            'email'    => ['required', 'email'],
            'range'    => ['required', 'in:daily,weekly'],
            'stats'    => ['required', 'array'],
            'stats.applied'   => ['required', 'integer', 'min:0'],
            'stats.interviews' => ['required', 'integer', 'min:0'],
            'stats.offers'    => ['required', 'integer', 'min:0'],
        ]);

        Notification::route('mail', $data['email'])
            ->notify(new PipelineDigest(range: $data['range'], stats: $data['stats']));

        return response()->json([
            'ok' => true,
            'dispatched' => "{$data['range']}_digest",
            'queued_to' => $data['email'],
        ]);
    }
}
