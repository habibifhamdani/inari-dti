<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNotFullBanned
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && $user->isFullyBanned()) {
            $blacklist = $user->blacklist()->first();

            return response()->json([
                'message' => 'Akun kamu sedang diblokir penuh dari mengakses platform INARI DTI.',
                'blacklist_level' => 'full_ban',
                'reason' => $blacklist?->reason,
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
