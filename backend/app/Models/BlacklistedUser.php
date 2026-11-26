<?php

namespace App\Models;

use App\Enums\BlacklistLevel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlacklistedUser extends Model
{
    protected $fillable = [
        'user_id',
        'level',
        'reason',
        'blacklisted_by',
    ];

    protected function casts(): array
    {
        return [
            'level' => BlacklistLevel::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function blacklistedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blacklisted_by');
    }
}
