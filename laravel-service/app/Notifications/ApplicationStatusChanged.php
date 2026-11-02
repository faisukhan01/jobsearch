<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationStatusChanged extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $jobTitle,
        public string $company,
        public string $status,
        public string $applicationId,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $emoji = match ($this->status) {
            'offer' => '🎉',
            'interview' => '📅',
            'screening' => '📞',
            'rejected' => '🕊️',
            default => '📤',
        };

        return (new MailMessage)
            ->subject("{$emoji} {$this->status}: {$this->jobTitle} @ {$this->company}")
            ->greeting("Pipeline update — {$this->status}")
            ->line("**{$this->jobTitle}** at **{$this->company}** moved to **{$this->status}**.")
            ->line("Application ref: `{$this->applicationId}`")
            ->action('Open JobPilot', url('/'))
            ->line('— Sent by JobPilot Autopilot · Laravel notification service');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'application_id' => $this->applicationId,
            'status' => $this->status,
            'job' => $this->jobTitle,
            'company' => $this->company,
        ];
    }
}
