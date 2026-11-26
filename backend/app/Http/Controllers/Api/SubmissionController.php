<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Submission\StoreSubmissionRequest;
use App\Http\Resources\SubmissionResource;
use App\Models\DtiEdition;
use App\Models\Submission;
use App\Services\EditionTransitionService;
use App\Services\ImageStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SubmissionController extends Controller
{
    public function store(
        StoreSubmissionRequest $request,
        DtiEdition $edition,
        EditionTransitionService $transitionService,
        ImageStorageService $storageService,
    ): JsonResponse {
        $user = $request->user();

        if ($user->isUploadBlocked()) {
            $blacklist = $user->blacklist()->first();

            return response()->json([
                'message' => 'Akun kamu sedang dibatasi dan tidak diperbolehkan mengupload karya.',
                'blacklist_level' => $blacklist?->level?->value,
                'reason' => $blacklist?->reason,
            ], Response::HTTP_FORBIDDEN);
        }

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Verifikasi email kamu terlebih dahulu sebelum mengirim karya.',
            ], Response::HTTP_FORBIDDEN);
        }

        $edition = $transitionService->evaluate($edition);

        if (! $edition->isSubmissionWindowActive()) {
            return response()->json([
                'message' => 'Periode pengumpulan karya untuk edisi ini sudah ditutup atau belum dibuka.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $uploaded = $storageService->uploadSubmissionImage(
            $request->file('image'),
            $edition->id,
            $user->id,
        );

        $oldPathsToDelete = [];
        $wasOverwrite = false;

        try {
            $submission = DB::transaction(function () use ($edition, $user, $request, $uploaded, &$oldPathsToDelete, &$wasOverwrite): Submission {
                /** @var Submission|null $existing */
                $existing = Submission::query()
                    ->where('edition_id', $edition->id)
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first();

                if ($existing !== null) {
                    $wasOverwrite = true;
                    $oldPathsToDelete = [$existing->image_path, $existing->thumbnail_path];

                    $existing->update([
                        'image_url' => $uploaded['image_url'],
                        'thumbnail_url' => $uploaded['thumbnail_url'],
                        'image_path' => $uploaded['image_path'],
                        'thumbnail_path' => $uploaded['thumbnail_path'],
                        'image_width' => $uploaded['image_width'],
                        'image_height' => $uploaded['image_height'],
                        'caption' => $request->input('caption'),
                        'is_anonymous' => $request->boolean('is_anonymous', $existing->is_anonymous),
                    ]);

                    return $existing->fresh(['user:id,name,avatar_url', 'edition']);
                }

                $created = Submission::query()->create([
                    'edition_id' => $edition->id,
                    'user_id' => $user->id,
                    'image_url' => $uploaded['image_url'],
                    'thumbnail_url' => $uploaded['thumbnail_url'],
                    'image_path' => $uploaded['image_path'],
                    'thumbnail_path' => $uploaded['thumbnail_path'],
                    'image_width' => $uploaded['image_width'],
                    'image_height' => $uploaded['image_height'],
                    'caption' => $request->input('caption'),
                    'is_anonymous' => $request->boolean('is_anonymous', false),
                    'is_hidden' => false,
                ]);

                return $created->load(['user:id,name,avatar_url', 'edition']);
            });
        } catch (\Throwable $e) {
            // Rollback newly uploaded S3/R2 objects if DB persistence fails.
            $storageService->deletePaths([$uploaded['image_path'], $uploaded['thumbnail_path']]);
            throw $e;
        }

        if ($oldPathsToDelete !== []) {
            $storageService->deletePaths($oldPathsToDelete);
        }

        return response()->json([
            'message' => $wasOverwrite
                ? 'Karya sebelumnya berhasil diperbarui dengan file baru.'
                : 'Karya berhasil dikirim!',
            'overwritten' => $wasOverwrite,
            'submission' => new SubmissionResource($submission),
        ], $wasOverwrite ? Response::HTTP_OK : Response::HTTP_CREATED);
    }
}
