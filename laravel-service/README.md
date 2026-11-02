# JobPilot Notification Service (Laravel 11)

The **notifications & webhooks microservice** of the JobPilot autopilot platform.
It receives signed events from the Next.js BFF and the FastAPI engine, and fans
them out to humans (email digests, interview pings, offer alerts).

```
Next.js BFF ──webhook──►  Laravel service  ──►  email / slack / calendar
FastAPI engine ──tick summary──►           └►  scheduled daily & weekly digests
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | liveness + channel list |
| POST | `/api/webhooks/application-status` | application moved pipeline stage |
| POST | `/api/webhooks/autopilot-tick` | autopilot tick summary |
| POST | `/api/digest/send` | ad-hoc daily/weekly digest |

All webhook routes require an HMAC-SHA256 signature header
(`X-JobPilot-Signature`) computed over the raw body with the shared
`JOBPILOT_WEBHOOK_SECRET`.

## Run

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan serve --host=0.0.0.0 --port=8080
```

Requires **PHP 8.2+** and Composer. (The dev sandbox that hosts the rest of the
platform has no PHP runtime, so this service ships code-complete and is meant
to run on any PHP host — e.g. a small VPS, Laravel Forge, or Docker.)
