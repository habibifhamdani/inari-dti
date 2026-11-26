<?php

namespace App\Http\Requests\Vote;

use Illuminate\Foundation\Http\FormRequest;

class SyncVotesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'votes' => ['required', 'array', 'min:1', 'max:5'],
            'votes.*.submission_id' => ['required', 'integer', 'distinct'],
            'votes.*.tier_points' => ['required', 'integer', 'between:1,5', 'distinct'],
        ];
    }
}
