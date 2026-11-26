<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\BlacklistLevel;
use App\Http\Controllers\Controller;
use App\Models\BlacklistedUser;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class BlacklistController extends Controller
{
    public function index(): JsonResponse
    {
        $entries = BlacklistedUser::query()
            ->with(['user:id,name,email,role,avatar_url', 'blacklistedBy:id,name'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (BlacklistedUser $entry): array => $this->transformEntry($entry));

        return response()->json([
            'blacklisted_users' => $entries,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'level' => ['required', Rule::enum(BlacklistLevel::class)],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        /** @var User $target */
        $target = User::query()->findOrFail($validated['user_id']);

        if ($target->isSuperadmin()) {
            return response()->json([
                'message' => 'Akun Superadmin (Kadiv) tidak dapat dimasukkan ke daftar blacklist.',
            ], Response::HTTP_FORBIDDEN);
        }

        if ($target->id === $request->user()->id) {
            return response()->json([
                'message' => 'Tidak dapat mem-blacklist akun sendiri.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $level = BlacklistLevel::from($validated['level']);

        $entry = BlacklistedUser::query()->updateOrCreate(
            ['user_id' => $target->id],
            [
                'level' => $level,
                'reason' => $validated['reason'] ?? null,
                'blacklisted_by' => $request->user()->id,
            ]
        );

        if ($level === BlacklistLevel::FullBan) {
            $target->tokens()->delete();
        }

        $entry->load(['user:id,name,email,role,avatar_url', 'blacklistedBy:id,name']);

        return response()->json([
            'message' => "{$target->name} berhasil ditambahkan ke blacklist ({$level->label()}).",
            'blacklisted_user' => $this->transformEntry($entry),
        ], Response::HTTP_CREATED);
    }

    public function destroy(BlacklistedUser $blacklistedUser): JsonResponse
    {
        $name = $blacklistedUser->user?->name ?? 'User';
        $blacklistedUser->delete();

        return response()->json([
            'message' => "Sanksi blacklist untuk {$name} telah dicabut.",
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformEntry(BlacklistedUser $entry): array
    {
        return [
            'id' => $entry->id,
            'user_id' => $entry->user_id,
            'level' => $entry->level?->value ?? $entry->level,
            'reason' => $entry->reason,
            'blacklisted_by' => $entry->blacklistedBy?->name,
            'user' => [
                'id' => $entry->user?->id,
                'name' => $entry->user?->name ?? 'Unknown',
                'email' => $entry->user?->email ?? '',
                'role' => $entry->user?->role?->value ?? $entry->user?->role,
                'avatar_url' => $entry->user?->avatar_url,
            ],
            'created_at' => $entry->created_at?->toIso8601String(),
            'updated_at' => $entry->updated_at?->toIso8601String(),
        ];
    }
}
