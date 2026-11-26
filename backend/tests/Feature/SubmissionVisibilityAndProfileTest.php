<?php

namespace Tests\Feature;

use App\Enums\EditionStatus;
use App\Enums\UserRole;
use App\Models\DtiEdition;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SubmissionVisibilityAndProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_submissions_are_hidden_from_members_until_submission_deadline_passes_except_admins(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
        $memberA = User::factory()->create(['role' => UserRole::Member]);
        $memberB = User::factory()->create(['role' => UserRole::Member]);

        $edition = DtiEdition::query()->create([
            'title' => 'Locked Gallery Edition',
            'slug' => 'locked-gallery',
            'prompt' => 'Draw a lantern.',
            'status' => EditionStatus::SubmissionOpen,
            'submission_deadline' => now()->addDays(3),
            'voting_deadline' => now()->addDays(8),
        ]);

        Submission::query()->create([
            'edition_id' => $edition->id,
            'user_id' => $memberA->id,
            'image_url' => 'https://cdn.example.com/a.png',
            'thumbnail_url' => 'https://cdn.example.com/a.webp',
            'image_path' => 'editions/a.png',
            'thumbnail_path' => 'editions/a.webp',
        ]);

        // Guest sees locked empty gallery
        $this->getJson('/api/editions/locked-gallery')
            ->assertOk()
            ->assertJsonPath('submissions_locked', true)
            ->assertJsonCount(0, 'submissions');

        // Member B sees locked empty gallery
        $this->actingAs($memberB, 'sanctum')
            ->getJson('/api/editions/locked-gallery')
            ->assertOk()
            ->assertJsonPath('submissions_locked', true)
            ->assertJsonCount(0, 'submissions')
            ->assertJsonPath('my_submission', null);

        // Member A sees own submission in my_submission, but public gallery remains locked
        $this->actingAs($memberA, 'sanctum')
            ->getJson('/api/editions/locked-gallery')
            ->assertOk()
            ->assertJsonPath('submissions_locked', true)
            ->assertJsonCount(0, 'submissions')
            ->assertJsonPath('my_submission.is_own_submission', true);

        // Admin & Superadmin can see all submissions before deadline
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/editions/locked-gallery')
            ->assertOk()
            ->assertJsonPath('submissions_locked', false)
            ->assertJsonCount(1, 'submissions');

        $this->actingAs($superadmin, 'sanctum')
            ->getJson('/api/editions/locked-gallery')
            ->assertOk()
            ->assertJsonPath('submissions_locked', false)
            ->assertJsonCount(1, 'submissions');

        // Once voting opens after submission deadline, members can view gallery
        $edition->update([
            'submission_deadline' => now()->subHour(),
            'status' => EditionStatus::VotingOpen,
        ]);

        $this->actingAs($memberB, 'sanctum')
            ->getJson('/api/editions/locked-gallery')
            ->assertOk()
            ->assertJsonPath('submissions_locked', false)
            ->assertJsonCount(1, 'submissions');
    }

    public function test_user_can_update_name_avatar_and_password(): void
    {
        Storage::fake('s3');

        $user = User::factory()->create([
            'name' => 'Old Name',
            'password' => 'oldpassword123',
        ]);

        // Update name + upload avatar
        $resp1 = $this->actingAs($user, 'sanctum')
            ->post('/api/profile', [
                'name' => 'New Artist Name',
                'avatar' => UploadedFile::fake()->image('avatar1.png', 600, 600),
            ]);

        $resp1->assertOk()
            ->assertJsonPath('user.name', 'New Artist Name');

        $firstPath = $user->fresh()->avatar_path;
        $this->assertNotNull($firstPath);
        Storage::disk('s3')->assertExists($firstPath);

        // Replace avatar deletes old file
        $this->actingAs($user, 'sanctum')
            ->post('/api/profile', [
                'name' => 'New Artist Name',
                'avatar' => UploadedFile::fake()->image('avatar2.png', 500, 500),
            ])
            ->assertOk();

        $secondPath = $user->fresh()->avatar_path;
        Storage::disk('s3')->assertMissing($firstPath);
        Storage::disk('s3')->assertExists($secondPath);

        // Wrong current password rejected
        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile/password', [
                'current_password' => 'wrongpassword',
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ])
            ->assertStatus(422);

        // Valid password update
        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile/password', [
                'current_password' => 'oldpassword123',
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('newpassword123', $user->fresh()->password));
    }
}
