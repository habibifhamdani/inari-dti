<?php

namespace App\Http\Requests\Admin;

use App\Enums\EditionStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEditionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:220', 'alpha_dash', 'unique:dti_editions,slug'],
            'prompt' => ['required', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::enum(EditionStatus::class)],
            'submission_deadline' => ['required', 'date'],
            'poll_deadline' => ['nullable', 'date'],
            'voting_deadline' => ['required', 'date', 'after:submission_deadline'],
            'reference_image' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:10240'],
        ];
    }
}
