<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PipelineDigest extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $range,
        public array $stats,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $title = $this->range === 'weekly' ? 'Weekly pipeline review' : 'Daily pipeline digest';

        return (new MailMessage)
            ->subject("📊 {$title} — {$this->stats['applied']} applied · {$this->stats['interviews']} interviews · {$this->stats['offers']} offers")
            ->greeting($title)
            ->line("**Applications sent:** {$this->stats['applied']}")
            ->line("**Interviews:** {$this->stats['interviews']}")
            ->line("**Offers:** {$this->stats['offers']}")
            ->action('Review your pipeline', url('/'))
            ->line('— JobPilot · Laravel notification service');
    }

    public function toArray(object $notifiable): array
    {
        return ['range' => $this->range, 'stats' => $this->stats];
    }
}
