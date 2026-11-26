<?php

namespace Tests\Feature;

use App\Enums\EditionStatus;
use App\Models\DtiEdition;
use App\Models\ExtensionVote;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EditionStateMachineTest extends TestCase
{
    use RefreshDatabase;

    private function createSubmission(DtiEdition $edition, User $user, bool $hidden = false): Submission
    {
        return Submission::query()->create([
            'edition_id' => $edition->id,
            'user_id' => $user->id,
            'image_url' => "https://cdn.example.com/{$user->id}.png",
            'thumbnail_url' => "https://cdn.example.com/{$user->id}.webp",
            'image_path' => "editions/{$edition->id}/{$user->id}.png",
            'thumbnail_path' => "editions/{$edition->id}/{$user->id}.webp",
            'image_width' => 1000,
            'image_height' => 1200,
            'is_anonymous' => false,
            'is_hidden' => $hidden,
        ]);
    }

    public function test_transitions_to_extension_poll_when_fewer_than_five_non_hidden_submissions(): void
    {
        $submissionDeadline = now()->subMinute();
        $edition = DtiEdition::query()->create([
            'title' => 'Low Turnout Edition',
            'slug' => 'low-turnout',
            'prompt' => 'Draw something.',
            'status' => EditionStatus::SubmissionOpen,
            'submission_deadline' => $submissionDeadline,
            'voting_deadline' => now()->addDays(5),
        ]);

        // 4 visible + 1 hidden = only 4 non-hidden!
        $users = User::factory()->count(5)->create();
        for ($i = 0; $i < 4; $i++) {
            $this->createSubmission($edition, $users[$i], false);
        }
        $this->createSubmission($edition, $users[4], true);

        $this->artisan('dti:process-transitions')->assertExitCode(0);

        $fresh = $edition->fresh();
        $this->assertEquals(EditionStatus::ExtensionPoll, $fresh->status);
        $this->assertEquals(
            $submissionDeadline->copy()->addHours(24)->timestamp,
            $fresh->poll_deadline->timestamp
        );
    }

    public function test_transitions_directly_to_voting_open_when_five_or_more_submissions(): void
    {
        $edition = DtiEdition::query()->create([
            'title' => 'Full Turnout Edition',
            'slug' => 'full-turnout',
            'prompt' => 'Draw something.',
            'status' => EditionStatus::SubmissionOpen,
            'submission_deadline' => now()->subMinute(),
            'voting_deadline' => now()->addDays(5),
        ]);

        $users = User::factory()->count(5)->create();
        foreach ($users as $user) {
            $this->createSubmission($edition, $user);
        }

        $this->artisan('dti:process-transitions')->assertExitCode(0);

        $this->assertEquals(EditionStatus::VotingOpen, $edition->fresh()->status);
    }

    public function test_extension_poll_extends_deadline_by_three_days_when_agree_outnumbers_disagree(): void
    {
        $submissionDeadline = now()->subDays(1)->subMinutes(10);
        $pollDeadline = now()->subMinute();

        $edition = DtiEdition::query()->create([
            'title' => 'Poll Extend Edition',
            'slug' => 'poll-extend',
            'prompt' => 'Draw something.',
            'status' => EditionStatus::ExtensionPoll,
            'submission_deadline' => $submissionDeadline,
            'poll_deadline' => $pollDeadline,
            'voting_deadline' => now()->addDays(5),
        ]);

        $voters = User::factory()->count(3)->create();
        ExtensionVote::query()->create(['edition_id' => $edition->id, 'user_id' => $voters[0]->id, 'agree_to_extend' => true]);
        ExtensionVote::query()->create(['edition_id' => $edition->id, 'user_id' => $voters[1]->id, 'agree_to_extend' => true]);
        ExtensionVote::query()->create(['edition_id' => $edition->id, 'user_id' => $voters[2]->id, 'agree_to_extend' => false]);

        $this->getJson('/api/editions/poll-extend')
            ->assertOk()
            ->assertJsonPath('edition.status', 'submission_open');

        $fresh = $edition->fresh();
        $this->assertEquals(
            $submissionDeadline->copy()->addDays(3)->timestamp,
            $fresh->submission_deadline->timestamp
        );
        $this->assertNull($fresh->poll_deadline);
    }

    public function test_extension_poll_transitions_to_voting_open_on_tie_or_rejection(): void
    {
        $edition = DtiEdition::query()->create([
            'title' => 'Poll Tie Edition',
            'slug' => 'poll-tie',
            'prompt' => 'Draw something.',
            'status' => EditionStatus::ExtensionPoll,
            'submission_deadline' => now()->subDays(1)->subMinutes(10),
            'poll_deadline' => now()->subMinute(),
            'voting_deadline' => now()->addDays(5),
        ]);

        $voters = User::factory()->count(2)->create();
        ExtensionVote::query()->create(['edition_id' => $edition->id, 'user_id' => $voters[0]->id, 'agree_to_extend' => true]);
        ExtensionVote::query()->create(['edition_id' => $edition->id, 'user_id' => $voters[1]->id, 'agree_to_extend' => false]);

        $this->artisan('dti:process-transitions')->assertExitCode(0);

        $this->assertEquals(EditionStatus::VotingOpen, $edition->fresh()->status);
    }

    public function test_voting_open_transitions_to_completed_after_voting_deadline(): void
    {
        $edition = DtiEdition::query()->create([
            'title' => 'Completed Edition',
            'slug' => 'completed-edition',
            'prompt' => 'Draw something.',
            'status' => EditionStatus::VotingOpen,
            'submission_deadline' => now()->subDays(7),
            'voting_deadline' => now()->subMinute(),
        ]);

        $this->artisan('dti:process-transitions')->assertExitCode(0);

        $this->assertEquals(EditionStatus::Completed, $edition->fresh()->status);
    }
}
