<?php

namespace App\Http\Controllers\Api;

use App\Enums\EditionStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\DtiEditionResource;
use App\Http\Resources\SubmissionResource;
use App\Models\DtiEdition;
use App\Models\Submission;
use App\Services\EditionTransitionService;
use App\Services\ImageStorageService;
use App\Services\SimpleZipBuilder;
use App\Services\StandingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class EditionController extends Controller
{
    public function index(): JsonResponse
    {
        $editions = DtiEdition::query()
            ->where('status', '!=', EditionStatus::Draft->value)
            ->withCount('visibleSubmissions')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'editions' => DtiEditionResource::collection($editions),
        ]);
    }

    public function active(Request $request, StandingsService $standingsService): JsonResponse
    {
        $edition = DtiEdition::query()
            ->whereIn('status', [
                EditionStatus::SubmissionOpen->value,
                EditionStatus::ExtensionPoll->value,
                EditionStatus::VotingOpen->value,
            ])
            ->orderByDesc('created_at')
            ->first();

        if ($edition === null) {
            $edition = DtiEdition::query()
                ->where('status', EditionStatus::Completed->value)
                ->orderByDesc('created_at')
                ->first();
        }

        if ($edition === null) {
            return response()->json([
                'edition' => null,
                'submissions' => [],
                'submissions_locked' => false,
                'my_submission' => null,
                'my_votes' => [],
                'standings' => null,
            ]);
        }

        return $this->buildEditionDetailResponse($request, $edition, $standingsService);
    }

    public function show(
        Request $request,
        string $slug,
        EditionTransitionService $transitionService,
        StandingsService $standingsService,
    ): JsonResponse {
        $edition = DtiEdition::query()
            ->where('slug', $slug)
            ->firstOrFail();

        if ($edition->status === EditionStatus::Draft && ! ($request->user()?->isAdmin() ?? false)) {
            return response()->json([
                'message' => 'Edisi tidak ditemukan.',
            ], Response::HTTP_NOT_FOUND);
        }

        $edition = $transitionService->evaluate($edition);

        return $this->buildEditionDetailResponse($request, $edition, $standingsService);
    }

    private function buildEditionDetailResponse(
        Request $request,
        DtiEdition $edition,
        StandingsService $standingsService,
    ): JsonResponse {
        $viewer = $request->user();

        $submissionsLocked = $edition->status === EditionStatus::SubmissionOpen
            && now()->lessThanOrEqualTo($edition->submission_deadline)
            && ! ($viewer?->isAdmin() ?? false);

        $submissions = $submissionsLocked
            ? collect()
            : $edition->visibleSubmissions()
                ->with(['user:id,name,avatar_url', 'edition'])
                ->orderByDesc('created_at')
                ->get();

        $mySubmission = null;
        $myVotes = [];

        if ($viewer !== null) {
            $own = $edition->submissions()
                ->where('user_id', $viewer->id)
                ->with(['user:id,name,avatar_url', 'edition'])
                ->first();

            if ($own !== null) {
                $mySubmission = new SubmissionResource($own);
            }

            $myVotes = $edition->votes()
                ->where('voter_id', $viewer->id)
                ->get(['submission_id', 'tier_points'])
                ->map(fn ($vote) => [
                    'submission_id' => $vote->submission_id,
                    'tier_points' => (int) $vote->tier_points,
                ])
                ->values()
                ->all();
        }

        $standings = null;
        if ($edition->status === EditionStatus::Completed) {
            $standings = $standingsService->getStandings($edition);
        }

        return response()->json([
            'edition' => new DtiEditionResource($edition),
            'submissions' => $submissionsLocked ? [] : SubmissionResource::collection($submissions),
            'submissions_locked' => $submissionsLocked,
            'my_submission' => $mySubmission,
            'my_votes' => $myVotes,
            'standings' => $standings,
        ]);
    }

    public function downloadSubmission(
        Request $request,
        DtiEdition $edition,
        Submission $submission,
        EditionTransitionService $transitionService,
        ImageStorageService $storageService,
    ): Response {
        if ($submission->edition_id !== $edition->id) {
            return response()->json([
                'message' => 'Karya tidak ditemukan pada edisi ini.',
            ], Response::HTTP_NOT_FOUND);
        }

        $edition = $transitionService->evaluate($edition);
        $viewer = $request->user();
        $isAdmin = $viewer?->isAdmin() ?? false;
        $isOwner = $viewer !== null && $viewer->id === $submission->user_id;

        if ($edition->status === EditionStatus::Draft && ! $isAdmin) {
            return response()->json([
                'message' => 'Edisi tidak ditemukan.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($submission->is_hidden && ! $isAdmin && ! $isOwner) {
            return response()->json([
                'message' => 'Karya tidak tersedia.',
            ], Response::HTTP_NOT_FOUND);
        }

        $submissionsLocked = $edition->status === EditionStatus::SubmissionOpen
            && now()->lessThanOrEqualTo($edition->submission_deadline)
            && ! $isAdmin
            && ! $isOwner;

        if ($submissionsLocked) {
            return response()->json([
                'message' => 'Karya belum dapat diunduh sebelum tenggat submission berakhir.',
            ], Response::HTTP_FORBIDDEN);
        }

        $contents = $storageService->readContents($submission->image_path);
        if ($contents === null) {
            return response()->json([
                'message' => 'File gambar tidak ditemukan di storage.',
            ], Response::HTTP_NOT_FOUND);
        }

        $submission->loadMissing('user:id,name');
        $filename = $this->buildDownloadFilename($edition, $submission, $isAdmin);
        $mimeType = $storageService->detectMimeType($submission->image_path);

        return response($contents, Response::HTTP_OK, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'no-store',
        ]);
    }

    public function downloadAll(
        Request $request,
        DtiEdition $edition,
        EditionTransitionService $transitionService,
        ImageStorageService $storageService,
    ): Response {
        $edition = $transitionService->evaluate($edition);
        $viewer = $request->user();
        $isAdmin = $viewer?->isAdmin() ?? false;

        if ($edition->status === EditionStatus::Draft && ! $isAdmin) {
            return response()->json([
                'message' => 'Edisi tidak ditemukan.',
            ], Response::HTTP_NOT_FOUND);
        }

        $submissionsLocked = $edition->status === EditionStatus::SubmissionOpen
            && now()->lessThanOrEqualTo($edition->submission_deadline)
            && ! $isAdmin;

        if ($submissionsLocked) {
            return response()->json([
                'message' => 'Karya belum dapat diunduh sebelum tenggat submission berakhir.',
            ], Response::HTTP_FORBIDDEN);
        }

        $submissions = $edition->visibleSubmissions()
            ->with('user:id,name')
            ->orderBy('id')
            ->get();

        if ($submissions->isEmpty()) {
            return response()->json([
                'message' => 'Belum ada karya pada edisi ini untuk diunduh.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $zip = new SimpleZipBuilder();
        $addedCount = 0;

        foreach ($submissions as $submission) {
            $contents = $storageService->readContents($submission->image_path);
            if ($contents === null) {
                continue;
            }
            $zip->addFromString(
                $this->buildDownloadFilename($edition, $submission, $isAdmin),
                $contents
            );
            $addedCount++;
        }

        if ($addedCount === 0) {
            return response()->json([
                'message' => 'File gambar pada edisi ini tidak ditemukan di storage.',
            ], Response::HTTP_NOT_FOUND);
        }

        $zipBytes = $zip->finish();
        $zipName = Str::slug($edition->slug ?: 'dti-edition').'-submissions.zip';

        return response($zipBytes, Response::HTTP_OK, [
            'Content-Type' => 'application/zip',
            'Content-Disposition' => 'attachment; filename="'.$zipName.'"',
            'Content-Length' => (string) strlen($zipBytes),
            'Cache-Control' => 'no-store',
        ]);
    }

    private function buildDownloadFilename(
        DtiEdition $edition,
        Submission $submission,
        bool $isAdmin,
    ): string {
        $ext = strtolower(pathinfo($submission->image_path, PATHINFO_EXTENSION) ?: 'png');
        $shouldMask = $submission->is_anonymous
            && $edition->status !== EditionStatus::Completed
            && ! $isAdmin;

        $authorPart = $shouldMask
            ? 'anonymous'
            : (Str::slug($submission->user?->name ?? 'artist') ?: 'artist');

        $editionPart = Str::slug($edition->slug ?: 'dti') ?: 'dti';

        return "{$editionPart}-{$authorPart}-{$submission->id}.{$ext}";
    }
}
