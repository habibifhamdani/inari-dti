<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('remove_avatar')) {
            $parsed = filter_var($this->input('remove_avatar'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($parsed !== null) {
                $this->merge(['remove_avatar' => $parsed]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'avatar' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:5120'],
            'remove_avatar' => ['sometimes', 'boolean'],
        ];
    }
}
