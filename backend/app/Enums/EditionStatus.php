<?php

namespace App\Enums;

enum EditionStatus: string
{
    case Draft = 'draft';
    case SubmissionOpen = 'submission_open';
    case ExtensionPoll = 'extension_poll';
    case VotingOpen = 'voting_open';
    case Completed = 'completed';
}
