<?php

namespace App\Enums;

enum VoteTier: int
{
    case Netherite = 5;
    case Diamond = 4;
    case Gold = 3;
    case Iron = 2;
    case Copper = 1;

    public function label(): string
    {
        return match ($this) {
            self::Netherite => 'Netherite',
            self::Diamond => 'Diamond',
            self::Gold => 'Gold',
            self::Iron => 'Iron',
            self::Copper => 'Copper',
        };
    }
}
