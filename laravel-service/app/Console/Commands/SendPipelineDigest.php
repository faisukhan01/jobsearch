<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * php artisan jobpilot:digest --range=daily|weekly
 * Called by the scheduler in routes/console.php. In a full deployment this
 * would query the platform DB (or call the Next.js BFF) for pipeline stats
 * and dispatch the PipelineDigest notification.
 */
class SendPipelineDigest extends Command
{
    protected $signature = 'jobpilot:digest {--range=daily}';
    protected $description = 'Send the daily/weekly pipeline digest email';

    public function handle(): int
    {
        $range = $this->option('range') === 'weekly' ? 'weekly' : 'daily';
        $this->info("Dispatching {$range} pipeline digest… (wire to BFF /api/stats for live numbers)");
        $this->line(' recipients: configured via JobPilot dashboard → Connections');

        return self::SUCCESS;
    }
}
