<?php

namespace Database\Seeders;

use App\Enums\EditionStatus;
use App\Enums\UserRole;
use App\Models\DtiEdition;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::query()->firstOrCreate(
            ['email' => 'kadiv.ga@apps.ipb.ac.id'],
            [
                'name' => 'Kadiv GA Inari',
                'password' => 'password123',
                'role' => UserRole::Superadmin,
                'email_verified_at' => now(),
            ]
        );

        if (DtiEdition::query()->doesntExist()) {
            DtiEdition::query()->create([
                'title' => 'DTI Vol. 12 — Cyber Botanica',
                'slug' => 'dti-vol-12-cyber-botanica',
                'prompt' => 'Ilustrasikan karakter atau lingkungan bertema perpaduan flora tropis Nusantara dengan teknologi futuristik di malam hari. Eksplorasi pencahayaan bioluminesen dan kontras siluet yang tajam.',
                'status' => EditionStatus::SubmissionOpen,
                'submission_deadline' => now()->addDays(7),
                'voting_deadline' => now()->addDays(14),
            ]);
        }
    }
}
