<?php

namespace App\Providers;

use App\Mail\Transport\BrevoTransport;
use App\Models\DtiEdition;
use App\Models\Submission;
use App\Policies\DtiEditionPolicy;
use App\Policies\SubmissionPolicy;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(DtiEdition::class, DtiEditionPolicy::class);
        Gate::policy(Submission::class, SubmissionPolicy::class);

        Mail::extend('brevo', function (array $config = []): BrevoTransport {
            return new BrevoTransport((string) ($config['key'] ?? config('services.brevo.key', '')));
        });

        VerifyEmail::createUrlUsing(function (object $notifiable): string {
            $signedUrl = URL::temporarySignedRoute(
                'verification.verify',
                Carbon::now()->addMinutes((int) Config::get('auth.verification.expire', 60)),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );

            $parsed = parse_url($signedUrl);
            parse_str($parsed['query'] ?? '', $query);

            $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');

            return $frontendUrl.'/verify-email?'.http_build_query([
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
                'expires' => $query['expires'] ?? '',
                'signature' => $query['signature'] ?? '',
            ]);
        });

        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');

            return $frontendUrl.'/reset-password?'.http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);
        });
    }
}
