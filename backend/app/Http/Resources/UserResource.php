<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\User
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $blacklist = $this->relationLoaded('blacklist')
            ? $this->getRelation('blacklist')
            : $this->blacklist()->first();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role?->value ?? $this->role,
            'is_superadmin' => $this->isSuperadmin(),
            'avatar_url' => $this->avatar_url,
            'is_verified' => $this->email_verified_at !== null,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'blacklist' => $blacklist ? [
                'level' => $blacklist->level?->value ?? $blacklist->level,
                'reason' => $blacklist->reason,
                'created_at' => $blacklist->created_at?->toIso8601String(),
            ] : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
