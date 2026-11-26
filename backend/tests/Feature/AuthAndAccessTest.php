<?php

namespace Tests\Feature;

use App\Enums\EditionStatus;
use App\Enums\UserRole;
use App\Models\DtiEdition;
use App\Models\User;
use App\Models\WhitelistedEmail;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AuthAndAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_rejects_registration_for_non_ipb_and_non_whitelisted_email(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Outsider Artist',
            'email' => 'outsider@gmail.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_accepts_registration_for_ipb_subdomains_and_whitelisted_emails(): void
    {
        Notification::fake();

        $admin = User::factory()->create(['role' => UserRole::Admin]);
        WhitelistedEmail::query()->create([
            'email' => 'alumni.inari@gmail.com',
            'added_by' => $admin->id,
        ]);

        $r1 = $this->postJson('/api/auth/register', [
            'name' => 'Mahasiswa IPB',
            'email' => 'artist@apps.ipb.ac.id',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);
        $r1->assertCreated()->assertJsonPath('user.role', 'member');

        $r2 = $this->postJson('/api/auth/register', [
            'name' => 'Dosen IPB',
            'email' => 'pembina@ipb.ac.id',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);
        $r2->assertCreated();

        $r3 = $this->postJson('/api/auth/register', [
            'name' => 'Alumni Inari',
            'email' => 'ALUMNI.INARI@GMAIL.COM',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);
        $r3->assertCreated()->assertJsonPath('user.email', 'alumni.inari@gmail.com');

        Notification::assertSentTimes(VerifyEmail::class, 3);
    }

    public function test_unverified_user_cannot_submit_artwork_or_vote_until_verified(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'unverified@apps.ipb.ac.id',
        ]);

        $edition = DtiEdition::query()->create([
            'title' => 'DTI Test',
            'slug' => 'dti-test',
            'prompt' => 'Draw a lantern.',
            'status' => EditionStatus::SubmissionOpen,
            'submission_deadline' => now()->addDays(3),
            'voting_deadline' => now()->addDays(6),
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/editions/{$edition->id}/submissions", [
                'image' => UploadedFile::fake()->image('art.png', 400, 300),
            ])
            ->assertStatus(403);

        $signedUrl = URL::temporarySignedRoute('verification.verify', now()->addMinutes(30), [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);

        $parsed = parse_url($signedUrl);
        $this->getJson($parsed['path'].'?'.$parsed['query'])
            ->assertOk()
            ->assertJsonPath('user.is_verified', true);

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_forgot_and_reset_password_flow(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'reset@apps.ipb.ac.id',
        ]);

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'reset@apps.ipb.ac.id',
        ])->assertOk();

        $capturedToken = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$capturedToken) {
            $capturedToken = $notification->token;

            return true;
        });

        $this->assertNotNull($capturedToken);

        $this->postJson('/api/auth/reset-password', [
            'token' => $capturedToken,
            'email' => 'reset@apps.ipb.ac.id',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertOk();

        $this->postJson('/api/auth/login', [
            'email' => 'reset@apps.ipb.ac.id',
            'password' => 'newpassword123',
        ])->assertOk()->assertJsonStructure(['token', 'user']);
    }
}
