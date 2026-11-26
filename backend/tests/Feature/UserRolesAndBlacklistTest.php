<?php

namespace Tests\Feature;

use App\Enums\BlacklistLevel;
use App\Enums\EditionStatus;
use App\Enums\UserRole;
use App\Models\DtiEdition;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UserRolesAndBlacklistTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_users_and_edit_roles_but_cannot_edit_superadmin(): void
    {
        $superadmin = User::factory()->create(['role' => UserRole::Superadmin, 'name' => 'Kadiv']);
        $admin = User::factory()->create(['role' => UserRole::Admin, 'name' => 'Panitia']);
        $member = User::factory()->create(['role' => UserRole::Member, 'name' => 'Member']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonCount(3, 'users');

        // Promote member -> admin
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$member->id}/role", ['role' => 'admin'])
            ->assertOk()
            ->assertJsonPath('user.role', 'admin');

        $this->assertEquals(UserRole::Admin, $member->fresh()->role);

        // Cannot promote anyone to superadmin
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$member->id}/role", ['role' => 'superadmin'])
            ->assertStatus(422);

        // Cannot edit superadmin's role
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$superadmin->id}/role", ['role' => 'member'])
            ->assertStatus(403);

        $this->assertEquals(UserRole::Superadmin, $superadmin->fresh()->role);
    }

    public function test_blacklist_levels_enforce_upload_voting_and_full_access_restrictions(): void
    {
        Storage::fake('s3');

        $superadmin = User::factory()->create(['role' => UserRole::Superadmin]);
        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $target = User::factory()->create(['role' => UserRole::Member, 'password' => 'password123']);
        $otherArtist = User::factory()->create(['role' => UserRole::Member]);

        $edition = DtiEdition::query()->create([
            'title' => 'Blacklist Test Edition',
            'slug' => 'blacklist-test',
            'prompt' => 'Draw.',
            'status' => EditionStatus::SubmissionOpen,
            'submission_deadline' => now()->addDays(2),
            'voting_deadline' => now()->addDays(5),
        ]);

        $otherSub = Submission::query()->create([
            'edition_id' => $edition->id,
            'user_id' => $otherArtist->id,
            'image_url' => 'https://cdn.example.com/other.png',
            'thumbnail_url' => 'https://cdn.example.com/other.webp',
            'image_path' => 'editions/other.png',
            'thumbnail_path' => 'editions/other.webp',
        ]);

        // Cannot blacklist superadmin
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/blacklist', [
                'user_id' => $superadmin->id,
                'level' => BlacklistLevel::FullBan->value,
            ])
            ->assertStatus(403);

        // Level 1: upload_blocked
        $blResp = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/blacklist', [
                'user_id' => $target->id,
                'level' => BlacklistLevel::UploadBlocked->value,
                'reason' => 'Pelanggaran aturan AI art.',
            ])
            ->assertCreated();

        $blacklistId = $blResp->json('blacklisted_user.id');

        $this->actingAs($target, 'sanctum')
            ->post("/api/editions/{$edition->id}/submissions", [
                'image' => UploadedFile::fake()->image('art.png', 400, 400),
            ])
            ->assertStatus(403);

        // Still allowed to browse & vote when only upload_blocked
        $edition->update([
            'submission_deadline' => now()->subHour(),
            'status' => EditionStatus::VotingOpen,
        ]);

        $this->actingAs($target, 'sanctum')
            ->postJson("/api/editions/{$edition->id}/votes", [
                'votes' => [['submission_id' => $otherSub->id, 'tier_points' => 5]],
            ])
            ->assertOk();

        // Level 2: interaction_blocked -> voting also blocked
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/blacklist', [
                'user_id' => $target->id,
                'level' => BlacklistLevel::InteractionBlocked->value,
            ])
            ->assertCreated();

        $this->actingAs($target, 'sanctum')
            ->postJson("/api/editions/{$edition->id}/votes", [
                'votes' => [['submission_id' => $otherSub->id, 'tier_points' => 4]],
            ])
            ->assertStatus(403);

        // Level 3: full_ban -> login blocked & bearer token blocked everywhere
        $token = $target->createToken('test-token')->plainTextToken;

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/blacklist', [
                'user_id' => $target->id,
                'level' => BlacklistLevel::FullBan->value,
                'reason' => 'Banned permanen.',
            ])
            ->assertCreated();

        $this->assertDatabaseCount('personal_access_tokens', 0);

        $this->postJson('/api/auth/login', [
            'email' => $target->email,
            'password' => 'password123',
        ])->assertStatus(403);

        // Re-creating a token manually still blocked by middleware
        $this->app['auth']->forgetGuards();
        $freshToken = $target->createToken('stale')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$freshToken}")
            ->getJson('/api/auth/me')
            ->assertStatus(403);

        // Unblacklist restores login
        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/blacklist/{$blacklistId}")
            ->assertOk();

        $this->postJson('/api/auth/login', [
            'email' => $target->email,
            'password' => 'password123',
        ])->assertOk();
    }
}
