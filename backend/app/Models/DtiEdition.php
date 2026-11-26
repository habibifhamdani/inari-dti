<?php

namespace App\Models;

use App\Enums\EditionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DtiEdition extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'prompt',
        'reference_image_url',
        'reference_image_path',
        'status',
        'submission_deadline',
        'poll_deadline',
        'voting_deadline',
    ];

    protected function casts(): array
    {
        return [
            'status' => EditionStatus::class,
            'submission_deadline' => 'datetime',
            'poll_deadline' => 'datetime',
            'voting_deadline' => 'datetime',
        ];
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class, 'edition_id');
    }

    public function visibleSubmissions(): HasMany
    {
        return $this->submissions()->where('is_hidden', false);
    }

    public function extensionVotes(): HasMany
    {
        return $this->hasMany(ExtensionVote::class, 'edition_id');
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class, 'edition_id');
    }

    public function isSubmissionWindowActive(): bool
    {
        return $this->status === EditionStatus::SubmissionOpen
            && now()->lessThanOrEqualTo($this->submission_deadline);
    }

    public function isExtensionPollActive(): bool
    {
        return $this->status === EditionStatus::ExtensionPoll
            && $this->poll_deadline !== null
            && now()->lessThanOrEqualTo($this->poll_deadline);
    }

    public function isVotingWindowActive(): bool
    {
        return $this->status === EditionStatus::VotingOpen
            && now()->lessThanOrEqualTo($this->voting_deadline);
    }
}
