<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Shared-secret signature check. The Next.js BFF signs every webhook with
 * JOBPILOT_WEBHOOK_SECRET (set in .env on both sides). HMAC-SHA256 over the
 * raw body keeps the contract tamper-evident without heavy infra.
 */
class VerifyJobPilotSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) env('JOBPILOT_WEBHOOK_SECRET', '');

        if ($secret === '') {
            return response()->json(['error' => 'webhook secret not configured'], 503);
        }

        $provided = (string) $request->header('X-JobPilot-Signature', '');
        $expected = hash_hmac('sha256', $request->getContent(), $secret);

        if ($provided === '' || ! hash_equals($expected, $provided)) {
            return response()->json(['error' => 'invalid signature'], 401);
        }

        return $next($request);
    }
}
