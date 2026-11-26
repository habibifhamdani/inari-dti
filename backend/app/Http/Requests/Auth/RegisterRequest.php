<?php

namespace App\Http\Requests\Auth;

use App\Rules\IpbOrWhitelistedEmail;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge([
                'email' => strtolower(trim((string) $this->input('email'))),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => [
                'required',
                'string',
                'email:rfc',
                'max:255',
                'unique:users,email',
                new IpbOrWhitelistedEmail(),
            ],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
