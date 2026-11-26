<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExtensionVote extends Model
{
    protected $fillable = [
        'edition_id',
        'user_id',
        'agree_to_extend',
    ];

    protected function casts(): array
    {
        return [
            'agree_to_extend' => 'boolean',
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
}
