<?php

namespace Tests\Feature;

use App\Enums\EditionStatus;
use App\Enums\UserRole;
use App\Models\DtiEdition;
use App\Models\Submission;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DownloadAndZipTest extends TestCase
{
    use RefreshDatabase;

    public function test_download_single_submission_and_archive_zip_respect_locks_and_anonymity(): void
    {
        Storage::fake('s3');

        $admin = User::factory()->create(['role' => UserRole::Admin]);
        $artistA = User::factory()->create(['role' => UserRole::Member, 'name' => 'Secret Painter']);
        $artistB = User::factory()->create(['role' => UserRole::Member, 'name' => 'Open Painter']);

        $edition = DtiEdition::query()->create([
            'title' => 'DTI Zip Test',
            'slug' => 'dti-zip-test',
            'prompt' => 'Draw.',
            'status' => EditionStatus::SubmissionOpen,
            'submission_deadline' => now()->addDays(2),
            'voting_deadline' => now()->addDays(6),
        ]);

        // Submit artwork as artistA (anonymous) and artistB
        $this->actingAs($artistA, 'sanctum')
            ->post("/api/editions/{$edition->id}/submissions", [
                'image' => UploadedFile::fake()->image('secret.png', 500, 500),
                'is_anonymous' => true,
            ])->assertCreated();

        $this->actingAs($artistB, 'sanctum')
            ->post("/api/editions/{$edition->id}/submissions", [
                'image' => UploadedFile::fake()->image('open.png', 600, 400),
                'is_anonymous' => false,
            ])->assertCreated();

        $subA = Submission::query()->where('user_id', $artistA->id)->firstOrFail();

        // While submission_open, member B cannot download A's work or download-all ZIP
        $this->actingAs($artistB, 'sanctum')
            ->getJson("/api/editions/{$edition->id}/submissions/{$subA->id}/download")
            ->assertStatus(403);

        $this->actingAs($artistB, 'sanctum')
            ->getJson("/api/editions/{$edition->id}/download-all")
            ->assertStatus(403);

        // Admin CAN download-all even during submission_open
        $adminZip = $this->actingAs($admin, 'sanctum')
            ->get("/api/editions/{$edition->id}/download-all");
        $adminZip->assertOk();
        $this->assertStringStartsWith("PK\x03\x04", $adminZip->getContent());

        // Move to voting_open: members can download single & ZIP, anonymous filename masked
        $edition->update([
            'submission_deadline' => now()->subHour(),
            'status' => EditionStatus::VotingOpen,
        ]);

        $single = $this->actingAs($artistB, 'sanctum')
            ->get("/api/editions/{$edition->id}/submissions/{$subA->id}/download");

        $single->assertOk();
        $disposition = (string) $single->headers->get('Content-Disposition');
        $this->assertStringContainsString('anonymous', $disposition);
        $this->assertStringNotContainsString('secret-painter', $disposition);

        $memberZip = $this->actingAs($artistB, 'sanctum')
            ->get("/api/editions/{$edition->id}/download-all");

        $memberZip->assertOk();
        $zipBytes = $memberZip->getContent();
        $this->assertStringStartsWith("PK\x03\x04", $zipBytes);
        $this->assertStringContainsString('dti-zip-test-anonymous-', $zipBytes);
        $this->assertStringContainsString('dti-zip-test-open-painter-', $zipBytes);
    }

    public function test_seeder_only_seeds_kadiv_superadmin_user(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('users', [
            'email' => 'kadiv.ga@apps.ipb.ac.id',
            'role' => 'superadmin',
        ]);
    }
}
