<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class BrevoTransportTest extends TestCase
{
    public function test_brevo_transport_sends_expected_http_payload(): void
    {
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response(['messageId' => '<msg-123@brevo>'], 201),
        ]);

        config()->set('services.brevo.key', 'xkeysib-test-key');
        config()->set('mail.from.address', 'sender@example.com');
        config()->set('mail.from.name', 'inari');

        Mail::mailer('brevo')->raw('Hello artist!', function ($message): void {
            $message->to('artist@apps.ipb.ac.id', 'Artist')
                ->subject('Verify Email');
        });

        Http::assertSent(function (Request $request): bool {
            $data = $request->data();

            return $request->url() === 'https://api.brevo.com/v3/smtp/email'
                && $request->hasHeader('api-key', 'xkeysib-test-key')
                && ($data['sender']['email'] ?? null) === 'sender@example.com'
                && ($data['sender']['name'] ?? null) === 'inari'
                && ($data['to'][0]['email'] ?? null) === 'artist@apps.ipb.ac.id'
                && ($data['subject'] ?? null) === 'Verify Email'
                && ($data['textContent'] ?? null) === 'Hello artist!';
        });
    }

    public function test_brevo_transport_throws_transport_exception_on_api_error(): void
    {
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response(['message' => 'Unauthorized'], 401),
        ]);

        config()->set('services.brevo.key', 'xkeysib-bad-key');
        config()->set('mail.from.address', 'sender@example.com');

        $this->expectException(TransportException::class);
        $this->expectExceptionMessage('Unauthorized');

        Mail::mailer('brevo')->raw('Test', function ($message): void {
            $message->to('artist@apps.ipb.ac.id')->subject('Fail Test');
        });
    }
}
