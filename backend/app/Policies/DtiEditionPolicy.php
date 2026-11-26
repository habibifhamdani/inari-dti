<?php

namespace App\Policies;

use App\Enums\EditionStatus;
use App\Models\DtiEdition;
use App\Models\User;

class DtiEditionPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, DtiEdition $edition): bool
    {
        if ($edition->status !== EditionStatus::Draft) {
            return true;
        }

        return $user?->isAdmin() ?? false;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, DtiEdition $edition): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, DtiEdition $edition): bool
    {
        return $user->isSuperadmin();
    }

    public function submit(User $user, DtiEdition $edition): bool
    {
        return $user->hasVerifiedEmail() && $edition->isSubmissionWindowActive();
    }

    public function vote(User $user, DtiEdition $edition): bool
    {
        return $user->hasVerifiedEmail() && $edition->isVotingWindowActive();
    }

    public function voteExtension(User $user, DtiEdition $edition): bool
    {
        return $user->hasVerifiedEmail() && $edition->isExtensionPollActive();
    }
}
