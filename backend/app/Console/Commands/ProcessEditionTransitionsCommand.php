<?php

namespace App\Console\Commands;

use App\Services\EditionTransitionService;
use Illuminate\Console\Command;

class ProcessEditionTransitionsCommand extends Command
{
    protected $signature = 'dti:process-transitions';

    protected $description = 'Evaluate and apply pending DTI edition state transitions.';

    public function handle(EditionTransitionService $transitionService): int
    {
        $count = $transitionService->processPendingTransitions();

        $this->info("Processed {$count} DTI edition transition(s).");

        return self::SUCCESS;
    }
}
