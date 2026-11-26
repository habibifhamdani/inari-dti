<?php

namespace App\Services;

use App\Enums\EditionStatus;
use App\Models\DtiEdition;
use Illuminate\Support\Facades\DB;

class EditionTransitionService
{
    private const MIN_SUBMISSIONS_FOR_VOTING = 5;

    public function processPendingTransitions(): int
    {
        $now = now();

        $candidateIds = DtiEdition::query()
            ->where(function ($query) use ($now) {
                $query->where(function ($q) use ($now) {
                    $q->where('status', EditionStatus::SubmissionOpen->value)
                        ->where('submission_deadline', '<', $now);
                })->orWhere(function ($q) use ($now) {
                    $q->where('status', EditionStatus::ExtensionPoll->value)
                        ->whereNotNull('poll_deadline')
                        ->where('poll_deadline', '<', $now);
                })->orWhere(function ($q) use ($now) {
                    $q->where('status', EditionStatus::VotingOpen->value)
                        ->where('voting_deadline', '<', $now);
                });
            })
            ->pluck('id');

        $transitioned = 0;

        foreach ($candidateIds as $editionId) {
            $before = DtiEdition::query()->whereKey($editionId)->value('status');
            $updated = $this->evaluateById((int) $editionId);
            if ($updated !== null && $updated->status->value !== $before) {
                $transitioned++;
            }
        }

        return $transitioned;
    }

    public function evaluate(DtiEdition $edition): DtiEdition
    {
        return $this->evaluateById($edition->id) ?? $edition;
    }

    public function evaluateById(int $editionId): ?DtiEdition
    {
        return DB::transaction(function () use ($editionId): ?DtiEdition {
            /** @var DtiEdition|null $edition */
            $edition = DtiEdition::query()->whereKey($editionId)->lockForUpdate()->first();

            if ($edition === null) {
                return null;
            }

            // Guard against infinite loops if deadlines are malformed.
            $maxHops = 5;
            while ($maxHops-- > 0) {
                $changed = $this->applyNextTransition($edition);
                if (! $changed) {
                    break;
                }
            }

            if ($edition->isDirty()) {
                $edition->save();
            }

            return $edition;
        });
    }

    private function applyNextTransition(DtiEdition $edition): bool
    {
        $now = now();

        if ($edition->status === EditionStatus::SubmissionOpen && $now->greaterThan($edition->submission_deadline)) {
            $visibleCount = $edition->submissions()->where('is_hidden', false)->count();

            if ($visibleCount < self::MIN_SUBMISSIONS_FOR_VOTING) {
                $edition->status = EditionStatus::ExtensionPoll;
                $edition->poll_deadline = $edition->submission_deadline->copy()->addHours(24);
            } else {
                $edition->status = EditionStatus::VotingOpen;
                $edition->poll_deadline = null;
            }

            return true;
        }

        if (
            $edition->status === EditionStatus::ExtensionPoll
            && $edition->poll_deadline !== null
            && $now->greaterThan($edition->poll_deadline)
        ) {
            $agreeCount = $edition->extensionVotes()->where('agree_to_extend', true)->count();
            $disagreeCount = $edition->extensionVotes()->where('agree_to_extend', false)->count();

            if ($agreeCount > $disagreeCount) {
                $newSubmissionDeadline = $edition->submission_deadline->copy()->addDays(3);
                $edition->submission_deadline = $newSubmissionDeadline;
                $edition->voting_deadline = $edition->voting_deadline->copy()->addDays(3);

                if ($edition->voting_deadline->lessThanOrEqualTo($newSubmissionDeadline)) {
                    $edition->voting_deadline = $newSubmissionDeadline->copy()->addDays(3);
                }

                $edition->poll_deadline = null;
                $edition->status = EditionStatus::SubmissionOpen;
            } else {
                $edition->poll_deadline = null;
                $edition->status = EditionStatus::VotingOpen;
            }

            return true;
        }

        if ($edition->status === EditionStatus::VotingOpen && $now->greaterThan($edition->voting_deadline)) {
            $edition->status = EditionStatus::Completed;

            return true;
        }

        return false;
    }
}
