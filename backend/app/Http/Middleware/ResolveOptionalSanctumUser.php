<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ResolveOptionalSanctumUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->bearerToken() !== null) {
            $user = Auth::guard('sanctum')->user();
            if ($user !== null) {
                if ($user->isFullyBanned()) {
                    $blacklist = $user->blacklist()->first();

                    return response()->json([
                        'message' => 'Akun kamu sedang diblokir penuh dari mengakses platform INARI DTI.',
                        'blacklist_level' => 'full_ban',
                        'reason' => $blacklist?->reason,
                    ], Response::HTTP_FORBIDDEN);
                }

                Auth::setUser($user);
                $request->setUserResolver(fn () => $user);
            }
        }

        return $next($request);
    }
}
