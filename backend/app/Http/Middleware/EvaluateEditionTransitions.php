<?php

namespace App\Http\Middleware;

use App\Services\EditionTransitionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EvaluateEditionTransitions
{
    public function __construct(
        private readonly EditionTransitionService $transitionService,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Lazy evaluation fallback ensures state transitions are always accurate
        // even if external cron execution is delayed or unavailable.
        $this->transitionService->processPendingTransitions();

        return $next($request);
    }
}
