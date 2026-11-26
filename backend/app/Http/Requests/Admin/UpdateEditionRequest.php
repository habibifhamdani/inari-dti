<?php

namespace App\Http\Requests\Admin;

use App\Enums\EditionStatus;
use App\Models\DtiEdition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEditionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var DtiEdition|null $edition */
        $edition = $this->route('edition');

        return [
            'title' => ['sometimes', 'string', 'max:200'],
            'slug' => [
                'sometimes',
                'string',
                'max:220',
                'alpha_dash',
                Rule::unique('dti_editions', 'slug')->ignore($edition?->id),
            ],
            'prompt' => ['sometimes', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::enum(EditionStatus::class)],
            'submission_deadline' => ['sometimes', 'date'],
            'poll_deadline' => ['nullable', 'date'],
            'voting_deadline' => ['sometimes', 'date'],
            'reference_image' => ['nullable', 'file', 'mimes:png,jpg,jpeg,webp', 'max:10240'],
            'remove_reference_image' => ['sometimes', 'boolean'],
        ];
    }
}
