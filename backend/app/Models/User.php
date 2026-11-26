<?php

namespace App\Models;

use App\Enums\BlacklistLevel;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'avatar_url', 'avatar_path'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    public function isSuperadmin(): bool
    {
        return $this->role === UserRole::Superadmin;
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, [UserRole::Admin, UserRole::Superadmin], true);
    }

    public function blacklist(): HasOne
    {
        return $this->hasOne(BlacklistedUser::class, 'user_id');
    }

    public function blacklistLevel(): ?BlacklistLevel
    {
        $record = $this->relationLoaded('blacklist')
            ? $this->getRelation('blacklist')
            : $this->blacklist()->first();

        return $record?->level;
    }

    public function isUploadBlocked(): bool
    {
        return in_array($this->blacklistLevel(), [
            BlacklistLevel::UploadBlocked,
            BlacklistLevel::InteractionBlocked,
            BlacklistLevel::FullBan,
        ], true);
    }

    public function isVotingBlocked(): bool
    {
        return in_array($this->blacklistLevel(), [
            BlacklistLevel::InteractionBlocked,
            BlacklistLevel::FullBan,
        ], true);
    }

    public function isFullyBanned(): bool
    {
        return $this->blacklistLevel() === BlacklistLevel::FullBan;
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class, 'voter_id');
    }

    public function extensionVotes(): HasMany
    {
        return $this->hasMany(ExtensionVote::class);
    }

    public function whitelistedEmailsAdded(): HasMany
    {
        return $this->hasMany(WhitelistedEmail::class, 'added_by');
    }
}
