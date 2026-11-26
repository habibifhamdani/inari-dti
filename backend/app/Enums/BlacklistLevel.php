<?php

namespace App\Enums;

enum BlacklistLevel: string
{
    case UploadBlocked = 'upload_blocked';
    case InteractionBlocked = 'interaction_blocked';
    case FullBan = 'full_ban';

    public function label(): string
    {
        return match ($this) {
            self::UploadBlocked => 'Upload Blocked',
            self::InteractionBlocked => 'Upload & Vote Blocked',
            self::FullBan => 'Full Platform Ban',
        };
    }
}
