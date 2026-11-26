<?php

namespace App\Policies;

use App\Models\Submission;
use App\Models\User;

class SubmissionPolicy
{
    public function view(?User $user, Submission $submission): bool
    {
        if (! $submission->is_hidden) {
            return true;
        }

        return ($user?->isAdmin() ?? false) || ($user !== null && $user->id === $submission->user_id);
    }

    public function moderate(User $user, Submission $submission): bool
    {
        return $user->isAdmin();
    }
}
