<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('edition_id')->constrained('dti_editions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('image_url');
            $table->string('thumbnail_url');
            $table->string('image_path');
            $table->string('thumbnail_path');
            $table->unsignedInteger('image_width')->nullable();
            $table->unsignedInteger('image_height')->nullable();
            $table->text('caption')->nullable();
            $table->boolean('is_anonymous')->default(false);
            $table->boolean('is_hidden')->default(false);
            $table->timestamps();

            $table->unique(['edition_id', 'user_id']);
            $table->index(['edition_id', 'is_hidden']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};
