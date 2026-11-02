<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AutopilotTickSummary extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $applied,
        public int $dailyLimit,
        public array $summary,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject("🤖 Autopilot sent {$this->applied} application(s) ({$this->applied}/{$this->dailyLimit} today)")
            ->greeting('Autopilot tick complete')
            ->line("The engine submitted **{$this->applied}** application(s) this tick — budget {$this->applied}/{$this->dailyLimit}.");

        foreach ($this->summary as $line) {
            $mail->line("• {$line}");
        }

        return $mail->line('— JobPilot · Laravel notification service');
    }

    public function toArray(object $notifiable): array
    {
        return ['applied' => $this->applied, 'daily_limit' => $this->dailyLimit];
    }
}
