<?php

namespace Tests\Feature;

use App\Enums\EditionStatus;
use App\Models\DtiEdition;
use App\Models\Submission;
use App\Models\User;
use App\Models\Vote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VotingAndStandingsTest extends TestCase
{
    use RefreshDatabase;

    private function makeSubmission(DtiEdition $edition, User $user, bool $anonymous = false, int $secondsOffset = 0): Submission
    {
        $submission = Submission::query()->create([
            'edition_id' => $edition->id,
            'user_id' => $user->id,
            'image_url' => "https://cdn.example.com/{$user->id}.png",
            'thumbnail_url' => "https://cdn.example.com/{$user->id}.webp",
            'image_path' => "editions/{$edition->id}/{$user->id}.png",
            'thumbnail_path' => "editions/{$edition->id}/{$user->id}.webp",
            'image_width' => 1000,
            'image_height' => 1400,
            'is_anonymous' => $anonymous,
            'is_hidden' => false,
        ]);

        if ($secondsOffset !== 0) {
            $submission->created_at = now()->addSeconds($secondsOffset);
            $submission->save();
        }

        return $submission;
    }

    public function test_anonymity_masks_author_during_voting_while_flagging_is_own_submission(): void
    {
        $edition = DtiEdition::query()->create([
            'title' => 'Anon Voting Test',
            'slug' => 'anon-voting',
            'prompt' => 'Draw a mask.',
            'status' => EditionStatus::VotingOpen,
            'submission_deadline' => now()->subDays(2),
            'voting_deadline' => now()->addDays(5),
        ]);

        $owner = User::factory()->create(['name' => 'Secret Artist']);
        $other = User::factory()->create(['name' => 'Voter Artist']);

        $ownSubmission = $this->makeSubmission($edition, $owner, anonymous: true);
        $otherSubmission = $this->makeSubmission($edition, $other, anonymous: false);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/editions/anon-voting');

        $response->assertOk();

        $submissions = collect($response->json('submissions'))->keyBy('id');

        $this->assertEquals('Anonymous', $submissions[$ownSubmission->id]['author']['name']);
        $this->assertNull($submissions[$ownSubmission->id]['author']['id']);
        $this->assertTrue($submissions[$ownSubmission->id]['is_own_submission']);

        $this->assertEquals('Voter Artist', $submissions[$otherSubmission->id]['author']['name']);
        $this->assertFalse($submissions[$otherSubmission->id]['is_own_submission']);
    }

    public function test_rejects_self_vote_and_allows_flexible_partial_ballot_sync(): void
    {
        $edition = DtiEdition::query()->create([
            'title' => 'Flexible Voting',
            'slug' => 'flexible-voting',
            'prompt' => 'Draw anything.',
            'status' => EditionStatus::VotingOpen,
            'submission_deadline' => now()->subDays(2),
            'voting_deadline' => now()->addDays(5),
        ]);

        $artists = User::factory()->count(4)->create();
        $submissions = $artists->map(fn (User $u) => $this->makeSubmission($edition, $u));

        $voter = $artists[0];

        // Self-vote must fail
        $this->actingAs($voter, 'sanctum')
            ->postJson("/api/editions/{$edition->id}/votes", [
                'votes' => [
                    ['submission_id' => $submissions[0]->id, 'tier_points' => 5],
                    ['submission_id' => $submissions[1]->id, 'tier_points' => 4],
                ],
            ])
            ->assertStatus(422);

        // Partial ballot (only 2 tiers out of 5, since only 3 other entries exist) must succeed
        $this->actingAs($voter, 'sanctum')
            ->postJson("/api/editions/{$edition->id}/votes", [
                'votes' => [
                    ['submission_id' => $submissions[1]->id, 'tier_points' => 5],
                    ['submission_id' => $submissions[2]->id, 'tier_points' => 3],
                ],
            ])
            ->assertOk()
            ->assertJsonCount(2, 'my_votes');

        // Re-submitting replaces old ballot cleanly
        $this->actingAs($voter, 'sanctum')
            ->postJson("/api/editions/{$edition->id}/votes", [
                'votes' => [
                    ['submission_id' => $submissions[3]->id, 'tier_points' => 4],
                ],
            ])
            ->assertOk()
            ->assertJsonCount(1, 'my_votes')
            ->assertJsonPath('my_votes.0.submission_id', $submissions[3]->id)
            ->assertJsonPath('my_votes.0.tier_points', 4);

        $this->assertDatabaseCount('votes', 1);
    }

    public function test_completed_edition_reveals_authors_and_ranks_tie_breakers_with_top3_and_honorable_mentions(): void
    {
        $edition = DtiEdition::query()->create([
            'title' => 'Hall of Fame Test',
            'slug' => 'hall-of-fame',
            'prompt' => 'Draw a castle.',
            'status' => EditionStatus::Completed,
            'submission_deadline' => now()->subDays(10),
            'voting_deadline' => now()->subDay(),
        ]);

        $artists = User::factory()->count(7)->create();
        $voters = User::factory()->count(4)->create();

        // Create 7 submissions; artists[0] and artists[1] will tie on 9 points,
        // but artists[0] has a Netherite (5pt + 4pt) while artists[1] has (4pt + 3pt + 2pt).
        $subs = [];
        foreach ($artists as $idx => $artist) {
            $subs[$idx] = $this->makeSubmission($edition, $artist, anonymous: true, secondsOffset: $idx * 10);
        }

        // Sub 0: 5 + 4 = 9 pts (1 Netherite, 1 Diamond)
        Vote::query()->create(['edition_id' => $edition->id, 'voter_id' => $voters[0]->id, 'submission_id' => $subs[0]->id, 'tier_points' => 5]);
        Vote::query()->create(['edition_id' => $edition->id, 'voter_id' => $voters[1]->id, 'submission_id' => $subs[0]->id, 'tier_points' => 4]);

        // Sub 1: 4 + 3 + 2 = 9 pts (0 Netherite, 1 Diamond, 1 Gold, 1 Iron)
        Vote::query()->create(['edition_id' => $edition->id, 'voter_id' => $voters[0]->id, 'submission_id' => $subs[1]->id, 'tier_points' => 4]);
        Vote::query()->create(['edition_id' => $edition->id, 'voter_id' => $voters[1]->id, 'submission_id' => $subs[1]->id, 'tier_points' => 3]);
        Vote::query()->create(['edition_id' => $edition->id, 'voter_id' => $voters[2]->id, 'submission_id' => $subs[1]->id, 'tier_points' => 2]);

        // Sub 2: 5 pts
        Vote::query()->create(['edition_id' => $edition->id, 'voter_id' => $voters[2]->id, 'submission_id' => $subs[2]->id, 'tier_points' => 5]);

        // Sub 3: 4 pts
        Vote::query()->create(['edition_id' => $edition->id, 'voter_id' => $voters[2]->id, 'submission_id' => $subs[3]->id, 'tier_points' => 4]);

        // Sub 4: 3 pts
        Vote::query()->create(['edition_id' => $edition->id, 'voter_id' => $voters[2]->id, 'submission_id' => $subs[4]->id, 'tier_points' => 3]);

        // Sub 5: 1 pt (created earlier than Sub 6 which has 1 pt too? Let's give Sub 5 1 pt and Sub 6 1 pt -> Sub 5 earlier created_at wins)
        Vote::query()->create(['edition_id' => $edition->id, 'voter_id' => $voters[2]->id, 'submission_id' => $subs[5]->id, 'tier_points' => 1]);
        Vote::query()->create(['edition_id' => $edition->id, 'voter_id' => $voters[3]->id, 'submission_id' => $subs[6]->id, 'tier_points' => 1]);

        $response = $this->getJson('/api/editions/hall-of-fame')->assertOk();

        // Authors revealed on completed edition
        $this->assertNotEquals('Anonymous', $response->json('submissions.0.author.name'));

        $winners = $response->json('standings.winners');
        $honorable = $response->json('standings.honorable_mentions');

        $this->assertCount(3, $winners);
        $this->assertCount(3, $honorable);
        $this->assertCount(7, $response->json('standings.standings'));

        // Rank 1: Sub 0 (9 pts, 1 Netherite beats Sub 1's 0 Netherite)
        $this->assertEquals($subs[0]->id, $winners[0]['submission_id']);
        $this->assertEquals(1, $winners[0]['rank']);
        $this->assertEquals($subs[1]->id, $winners[1]['submission_id']);
        $this->assertEquals($subs[2]->id, $winners[2]['submission_id']);

        // Ranks 4-6: Sub 3, Sub 4, Sub 5 (Sub 5 beats Sub 6 on earlier created_at)
        $this->assertEquals($subs[3]->id, $honorable[0]['submission_id']);
        $this->assertEquals($subs[4]->id, $honorable[1]['submission_id']);
        $this->assertEquals($subs[5]->id, $honorable[2]['submission_id']);
    }
}
