<?php

namespace App\Rules;

use App\Models\WhitelistedEmail;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class IpbOrWhitelistedEmail implements ValidationRule
{
    public const IPB_DOMAIN_REGEX = '/@([a-z0-9-]+\.)*ipb\.ac\.id$/i';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $email = strtolower(trim((string) $value));

        if (preg_match(self::IPB_DOMAIN_REGEX, $email) === 1) {
            return;
        }

        $isWhitelisted = WhitelistedEmail::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->exists();

        if (! $isWhitelisted) {
            $fail('Registrasi hanya dibuka untuk email resmi IPB University (@apps.ipb.ac.id / @ipb.ac.id) atau email yang terdaftar di whitelist Divisi GA.');
        }
    }
}
