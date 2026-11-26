<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdatePasswordRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\ImageStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    public function updateProfile(
        UpdateProfileRequest $request,
        ImageStorageService $storageService,
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();
        $oldAvatarPath = null;

        $updates = [
            'name' => trim((string) $request->validated('name')),
        ];

        if ($request->boolean('remove_avatar') && $user->avatar_path !== null) {
            $oldAvatarPath = $user->avatar_path;
            $updates['avatar_url'] = null;
            $updates['avatar_path'] = null;
        }

        if ($request->hasFile('avatar')) {
            $oldAvatarPath = $user->avatar_path;
            $uploaded = $storageService->uploadAvatar($request->file('avatar'), $user->id);
            $updates['avatar_url'] = $uploaded['url'];
            $updates['avatar_path'] = $uploaded['path'];
        }

        $user->update($updates);

        if ($oldAvatarPath !== null) {
            $storageService->deletePaths([$oldAvatarPath]);
        }

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'user' => new UserResource($user->fresh('blacklist')),
        ]);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $user->forceFill([
            'password' => $request->validated('password'),
            'remember_token' => Str::random(60),
        ])->save();

        return response()->json([
            'message' => 'Password berhasil diperbarui.',
        ]);
    }
}
