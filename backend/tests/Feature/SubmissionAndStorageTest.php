<?php

namespace Tests\Feature;

use App\Enums\EditionStatus;
use App\Models\DtiEdition;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SubmissionAndStorageTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_user_can_submit_and_overwrite_deleting_old_s3_files(): void
    {
        Storage::fake('s3');

        $user = User::factory()->create(['email' => 'artist@apps.ipb.ac.id']);

        $edition = DtiEdition::query()->create([
            'title' => 'DTI Storage Test',
            'slug' => 'dti-storage-test',
            'prompt' => 'Draw a crystal.',
            'status' => EditionStatus::SubmissionOpen,
            'submission_deadline' => now()->addDays(2),
            'voting_deadline' => now()->addDays(5),
        ]);

        // First submission
        $firstResponse = $this->actingAs($user, 'sanctum')
            ->post("/api/editions/{$edition->id}/submissions", [
                'image' => UploadedFile::fake()->image('first.png', 1200, 800),
                'caption' => 'First draft',
                'is_anonymous' => true,
            ]);

        $firstResponse->assertCreated()
            ->assertJsonPath('overwritten', false)
            ->assertJsonPath('submission.image_width', 1200)
            ->assertJsonPath('submission.image_height', 800)
            ->assertJsonPath('submission.is_anonymous', true);

        $firstSubmission = Submission::query()->firstOrFail();
        $oldImagePath = $firstSubmission->image_path;
        $oldThumbPath = $firstSubmission->thumbnail_path;

        Storage::disk('s3')->assertExists($oldImagePath);
        Storage::disk('s3')->assertExists($oldThumbPath);

        // Overwrite submission before deadline
        $secondResponse = $this->actingAs($user, 'sanctum')
            ->post("/api/editions/{$edition->id}/submissions", [
                'image' => UploadedFile::fake()->image('second.png', 1600, 900),
                'caption' => 'Polished final',
                'is_anonymous' => false,
            ]);

        $secondResponse->assertOk()
            ->assertJsonPath('overwritten', true)
            ->assertJsonPath('submission.caption', 'Polished final')
            ->assertJsonPath('submission.image_width', 1600);

        $this->assertDatabaseCount('submissions', 1);

        $updatedSubmission = $firstSubmission->fresh();
        Storage::disk('s3')->assertMissing($oldImagePath);
        Storage::disk('s3')->assertMissing($oldThumbPath);
        Storage::disk('s3')->assertExists($updatedSubmission->image_path);
        Storage::disk('s3')->assertExists($updatedSubmission->thumbnail_path);
    }

    public function test_submission_rejected_after_deadline(): void
    {
        Storage::fake('s3');

        $user = User::factory()->create(['email' => 'late@apps.ipb.ac.id']);
        $edition = DtiEdition::query()->create([
            'title' => 'DTI Late Test',
            'slug' => 'dti-late-test',
            'prompt' => 'Draw a star.',
            'status' => EditionStatus::SubmissionOpen,
            'submission_deadline' => now()->subMinute(),
            'voting_deadline' => now()->addDays(5),
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/editions/{$edition->id}/submissions", [
                'image' => UploadedFile::fake()->image('late.png', 600, 600),
            ])
            ->assertStatus(422);

        $this->assertEquals(EditionStatus::ExtensionPoll, $edition->fresh()->status);
    }
}
