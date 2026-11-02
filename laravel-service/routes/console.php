<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Morning digest of overnight autopilot activity (08:00 platform TZ)
Schedule::command('jobpilot:digest --range=daily')->dailyAt('08:00');

// Weekly pipeline review (Mondays 09:00)
Schedule::command('jobpilot:digest --range=weekly')->mondays()->at('09:00');
