<?php

namespace App\Http\Resources;

use App\Enums\EditionStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\DtiEdition
 */
class DtiEditionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();

        $visibleCount = $this->visible_submissions_count
            ?? $this->visibleSubmissions()->count();

        $extensionSummary = null;
        if ($this->status === EditionStatus::ExtensionPoll) {
            $agree = $this->agree_votes_count
                ?? $this->extensionVotes()->where('agree_to_extend', true)->count();
            $disagree = $this->disagree_votes_count
                ?? $this->extensionVotes()->where('agree_to_extend', false)->count();

            $userVote = null;
            if ($viewer !== null) {
                $existing = $this->extensionVotes()
                    ->where('user_id', $viewer->id)
                    ->first();
                $userVote = $existing?->agree_to_extend;
            }

            $extensionSummary = [
                'agree_count' => (int) $agree,
                'disagree_count' => (int) $disagree,
                'total_votes' => (int) $agree + (int) $disagree,
                'user_vote' => $userVote,
            ];
        }

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'prompt' => $this->prompt,
            'reference_image_url' => $this->reference_image_url,
            'status' => $this->status?->value ?? $this->status,
            'submission_deadline' => $this->submission_deadline?->toIso8601String(),
            'poll_deadline' => $this->poll_deadline?->toIso8601String(),
            'voting_deadline' => $this->voting_deadline?->toIso8601String(),
            'visible_submissions_count' => (int) $visibleCount,
            'submissions_locked' => $this->status === EditionStatus::SubmissionOpen
                && now()->lessThanOrEqualTo($this->submission_deadline)
                && ! ($viewer?->isAdmin() ?? false),
            'extension_poll' => $extensionSummary,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
