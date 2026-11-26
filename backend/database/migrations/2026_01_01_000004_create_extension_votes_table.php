<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('extension_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('edition_id')->constrained('dti_editions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('agree_to_extend');
            $table->timestamps();

            $table->unique(['edition_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('extension_votes');
    }
};
