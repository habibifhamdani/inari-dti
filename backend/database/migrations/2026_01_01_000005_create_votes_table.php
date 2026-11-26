<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('edition_id')->constrained('dti_editions')->cascadeOnDelete();
            $table->foreignId('voter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('submission_id')->constrained('submissions')->cascadeOnDelete();
            $table->smallInteger('tier_points');
            $table->timestamps();

            $table->unique(['edition_id', 'voter_id', 'submission_id']);
            $table->unique(['edition_id', 'voter_id', 'tier_points']);
            $table->index(['edition_id', 'submission_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('votes');
    }
};
