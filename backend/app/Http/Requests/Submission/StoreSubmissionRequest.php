<?php

namespace App\Http\Requests\Submission;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_anonymous')) {
            $parsed = filter_var($this->input('is_anonymous'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($parsed !== null) {
                $this->merge(['is_anonymous' => $parsed]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'mimes:png,jpg,jpeg,webp', 'max:15360'],
            'caption' => ['nullable', 'string', 'max:500'],
            'is_anonymous' => ['sometimes', 'boolean'],
        ];
    }
}
