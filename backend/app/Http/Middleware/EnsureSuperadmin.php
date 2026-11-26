<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperadmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || ! $user->isSuperadmin()) {
            return response()->json([
                'message' => 'Akses ditolak. Hanya Superadmin yang diizinkan menghapus edisi.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
