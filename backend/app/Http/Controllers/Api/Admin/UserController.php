<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $users = User::query()
            ->with('blacklist')
            ->when($search !== '', function ($query) use ($search) {
                $needle = '%'.strtolower($search).'%';
                $query->where(function ($q) use ($needle) {
                    $q->whereRaw('LOWER(name) LIKE ?', [$needle])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$needle]);
                });
            })
            ->orderBy('id')
            ->get();

        return response()->json([
            'users' => UserResource::collection($users),
        ]);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        if ($user->isSuperadmin()) {
            return response()->json([
                'message' => 'Akun Superadmin (Kadiv) tidak dapat diubah role-nya oleh siapapun.',
            ], Response::HTTP_FORBIDDEN);
        }

        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Tidak diperbolehkan mengubah role akun sendiri.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'role' => ['required', Rule::in([UserRole::Admin->value, UserRole::Member->value])],
        ]);

        $user->update([
            'role' => UserRole::from($validated['role']),
        ]);

        return response()->json([
            'message' => "Role {$user->name} berhasil diubah menjadi {$validated['role']}.",
            'user' => new UserResource($user->fresh('blacklist')),
        ]);
    }
}
