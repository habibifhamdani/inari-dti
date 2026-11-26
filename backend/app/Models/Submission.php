<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Submission extends Model
{
    use HasFactory;

    protected $fillable = [
        'edition_id',
        'user_id',
        'image_url',
        'thumbnail_url',
        'image_path',
        'thumbnail_path',
        'image_width',
        'image_height',
        'caption',
        'is_anonymous',
        'is_hidden',
    ];

    protected function casts(): array
    {
        return [
            'is_anonymous' => 'boolean',
            'is_hidden' => 'boolean',
            'image_width' => 'integer',
            'image_height' => 'integer',
        ];
    }

    public function edition(): BelongsTo
    {
        return $this->belongsTo(DtiEdition::class, 'edition_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class, 'submission_id');
    }
}
