<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\MessageConverter;
use Throwable;

class BrevoTransport extends AbstractTransport
{
    public function __construct(private readonly string $apiKey)
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        if ($this->apiKey === '') {
            throw new TransportException('Brevo API key is not configured.');
        }

        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $envelope = $message->getEnvelope();
        $sender = $envelope->getSender();

        $payload = [
            'sender' => $this->formatAddress($sender),
            'to' => array_values(array_map(
                fn (Address $address) => $this->formatAddress($address),
                $this->getRecipients($email, $envelope),
            )),
            'subject' => (string) $email->getSubject(),
        ];

        $cc = array_values(array_map(fn (Address $address) => $this->formatAddress($address), $email->getCc()));
        if ($cc !== []) {
            $payload['cc'] = $cc;
        }

        $bcc = array_values(array_map(fn (Address $address) => $this->formatAddress($address), $email->getBcc()));
        if ($bcc !== []) {
            $payload['bcc'] = $bcc;
        }

        $replyTo = $email->getReplyTo();
        if ($replyTo !== []) {
            $payload['replyTo'] = $this->formatAddress($replyTo[0]);
        }

        $html = $email->getHtmlBody();
        if (is_string($html) && $html !== '') {
            $payload['htmlContent'] = $html;
        }

        $text = $email->getTextBody();
        if (is_string($text) && $text !== '') {
            $payload['textContent'] = $text;
        }

        try {
            $response = Http::acceptJson()
                ->asJson()
                ->withHeaders(['api-key' => $this->apiKey])
                ->timeout(15)
                ->post('https://api.brevo.com/v3/smtp/email', $payload);
        } catch (Throwable $exception) {
            throw new TransportException(
                sprintf('Request to Brevo API failed. Reason: %s', $exception->getMessage()),
                is_int($exception->getCode()) ? $exception->getCode() : 0,
                $exception,
            );
        }

        if ($response->failed()) {
            $reason = $response->json('message') ?: $response->body() ?: ('HTTP ' . $response->status());
            throw new TransportException(
                sprintf('Request to Brevo API failed (%d). Reason: %s', $response->status(), $reason),
                $response->status(),
            );
        }

        $messageId = (string) ($response->json('messageId') ?? '');
        if ($messageId !== '') {
            $message->setMessageId($messageId);
            if ($message->getOriginalMessage() instanceof \Symfony\Component\Mime\Message) {
                $message->getOriginalMessage()->getHeaders()->addHeader('X-Brevo-Message-ID', $messageId);
            }
        }
    }

    /**
     * @return array{email: string, name?: string}
     */
    private function formatAddress(Address $address): array
    {
        $formatted = ['email' => $address->getAddress()];
        $name = trim($address->getName());

        if ($name !== '') {
            $formatted['name'] = $name;
        }

        return $formatted;
    }

    /**
     * @return array<int, Address>
     */
    private function getRecipients(Email $email, Envelope $envelope): array
    {
        $ccAndBcc = array_merge($email->getCc(), $email->getBcc());

        return array_filter(
            $envelope->getRecipients(),
            fn (Address $address) => in_array($address, $ccAndBcc, true) === false,
        );
    }

    public function __toString(): string
    {
        return 'brevo';
    }
}
