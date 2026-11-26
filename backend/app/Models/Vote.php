<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vote extends Model
{
    protected $fillable = [
        'edition_id',
        'voter_id',
        'submission_id',
        'tier_points',
    ];

    protected function casts(): array
    {
        return [
            'tier_points' => 'integer',
        ];
    }

    public function edition(): BelongsTo
    {
        return $this->belongsTo(DtiEdition::class, 'edition_id');
    }

    public function voter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voter_id');
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(Submission::class, 'submission_id');
    }
}
