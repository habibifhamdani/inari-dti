<?php

namespace Tests\Feature;

use App\Enums\EditionStatus;
use App\Enums\UserRole;
use App\Models\DtiEdition;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_is_forbidden_from_admin_endpoints(): void
    {
        $member = User::factory()->create(['role' => UserRole::Member]);

        $this->actingAs($member, 'sanctum')
            ->getJson('/api/admin/editions')
            ->assertStatus(403);

        $this->actingAs($member, 'sanctum')
            ->postJson('/api/admin/whitelisted-emails', ['email' => 'guest@gmail.com'])
            ->assertStatus(403);
    }

    public function test_admin_can_crud_edition_manage_whitelist_moderate_and_override_state(): void
    {
        Storage::fake('s3');

        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $member = User::factory()->create(['role' => UserRole::Member]);

        // Whitelist CRUD
        $wlCreate = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/whitelisted-emails', ['email' => 'Special.Member@gmail.com'])
            ->assertCreated()
            ->assertJsonPath('whitelisted_email.email', 'special.member@gmail.com');

        $wlId = $wlCreate->json('whitelisted_email.id');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/whitelisted-emails')
            ->assertOk()
            ->assertJsonCount(1, 'whitelisted_emails');

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/whitelisted-emails/{$wlId}")
            ->assertOk();

        // Edition Create with reference image
        $createResp = $this->actingAs($admin, 'sanctum')
            ->post('/api/admin/editions', [
                'title' => 'DTI Vol 99 — Celestial Shrine',
                'prompt' => 'Illustrate an ancient floating shrine.',
                'status' => EditionStatus::SubmissionOpen->value,
                'submission_deadline' => now()->addDays(5)->toIso8601String(),
                'voting_deadline' => now()->addDays(10)->toIso8601String(),
                'reference_image' => UploadedFile::fake()->image('ref.png', 800, 600),
            ])
            ->assertCreated();

        $editionId = $createResp->json('edition.id');
        $edition = DtiEdition::query()->findOrFail($editionId);
        Storage::disk('s3')->assertExists($edition->reference_image_path);

        // Moderation toggle
        $submission = Submission::query()->create([
            'edition_id' => $edition->id,
            'user_id' => $member->id,
            'image_url' => 'https://cdn.example.com/sub.png',
            'thumbnail_url' => 'https://cdn.example.com/sub.webp',
            'image_path' => 'editions/sub.png',
            'thumbnail_path' => 'editions/sub.webp',
            'is_anonymous' => true,
            'is_hidden' => false,
        ]);

        // Admin submissions list sees real author email
        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/editions/{$edition->id}/submissions")
            ->assertOk()
            ->assertJsonPath('submissions.0.author.email', $member->email);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/submissions/{$submission->id}/visibility", ['is_hidden' => true])
            ->assertOk()
            ->assertJsonPath('submission.is_hidden', true);

        // State override: close voting early -> completed
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/editions/{$edition->id}/state-override", [
                'action' => 'close_voting_early',
            ])
            ->assertOk()
            ->assertJsonPath('edition.status', 'completed');

        // Regular admin cannot delete edition (superadmin only)
        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/editions/{$edition->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('dti_editions', ['id' => $edition->id]);

        // Superadmin CAN delete edition
        $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
        $this->actingAs($superadmin, 'sanctum')
            ->deleteJson("/api/admin/editions/{$edition->id}")
            ->assertOk();

        $this->assertDatabaseMissing('dti_editions', ['id' => $edition->id]);
    }
}
