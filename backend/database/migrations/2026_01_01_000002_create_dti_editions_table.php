<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dti_editions', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('prompt');
            $table->string('reference_image_url')->nullable();
            $table->string('reference_image_path')->nullable();
            $table->string('status', 30)->default('draft')->index();
            $table->timestamp('submission_deadline');
            $table->timestamp('poll_deadline')->nullable();
            $table->timestamp('voting_deadline');
            $table->timestamps();

            $table->index(['status', 'submission_deadline']);
            $table->index(['status', 'poll_deadline']);
            $table->index(['status', 'voting_deadline']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dti_editions');
    }
};
