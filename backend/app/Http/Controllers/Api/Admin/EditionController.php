<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\EditionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreEditionRequest;
use App\Http\Requests\Admin\UpdateEditionRequest;
use App\Http\Resources\DtiEditionResource;
use App\Models\DtiEdition;
use App\Models\Submission;
use App\Services\ImageStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class EditionController extends Controller
{
    public function index(): JsonResponse
    {
        $editions = DtiEdition::query()
            ->withCount(['visibleSubmissions', 'submissions', 'votes'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'editions' => DtiEditionResource::collection($editions),
        ]);
    }

    public function store(StoreEditionRequest $request, ImageStorageService $storage): JsonResponse
    {
        $validated = $request->validated();
        $slug = $validated['slug'] ?? $this->generateUniqueSlug($validated['title']);

        $edition = DtiEdition::query()->create([
            'title' => $validated['title'],
            'slug' => $slug,
            'prompt' => $validated['prompt'],
            'status' => $validated['status'] ?? EditionStatus::Draft->value,
            'submission_deadline' => $validated['submission_deadline'],
            'poll_deadline' => $validated['poll_deadline'] ?? null,
            'voting_deadline' => $validated['voting_deadline'],
        ]);

        if ($request->hasFile('reference_image')) {
            $uploaded = $storage->uploadReferenceImage($request->file('reference_image'), $edition->id);
            $edition->update([
                'reference_image_url' => $uploaded['url'],
                'reference_image_path' => $uploaded['path'],
            ]);
        }

        return response()->json([
            'message' => 'Edisi DTI berhasil dibuat.',
            'edition' => new DtiEditionResource($edition->fresh()),
        ], Response::HTTP_CREATED);
    }

    public function update(
        UpdateEditionRequest $request,
        DtiEdition $edition,
        ImageStorageService $storage,
    ): JsonResponse {
        $validated = $request->validated();

        $oldRefPath = null;

        if ($request->boolean('remove_reference_image') && $edition->reference_image_path !== null) {
            $oldRefPath = $edition->reference_image_path;
            $validated['reference_image_url'] = null;
            $validated['reference_image_path'] = null;
        }

        if ($request->hasFile('reference_image')) {
            $oldRefPath = $edition->reference_image_path;
            $uploaded = $storage->uploadReferenceImage($request->file('reference_image'), $edition->id);
            $validated['reference_image_url'] = $uploaded['url'];
            $validated['reference_image_path'] = $uploaded['path'];
        }

        unset($validated['reference_image'], $validated['remove_reference_image']);

        $edition->update($validated);

        if ($oldRefPath !== null) {
            $storage->deletePaths([$oldRefPath]);
        }

        return response()->json([
            'message' => 'Edisi DTI berhasil diperbarui.',
            'edition' => new DtiEditionResource($edition->fresh()),
        ]);
    }

    public function destroy(DtiEdition $edition, ImageStorageService $storage): JsonResponse
    {
        $paths = $edition->submissions()
            ->get(['image_path', 'thumbnail_path'])
            ->flatMap(fn (Submission $s) => [$s->image_path, $s->thumbnail_path])
            ->all();

        if ($edition->reference_image_path !== null) {
            $paths[] = $edition->reference_image_path;
        }

        $edition->delete();

        $storage->deletePaths($paths);

        return response()->json([
            'message' => 'Edisi DTI beserta seluruh file terkait berhasil dihapus.',
        ]);
    }

    public function submissions(DtiEdition $edition): JsonResponse
    {
        $submissions = $edition->submissions()
            ->with('user:id,name,email,avatar_url')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Submission $s): array => [
                'id' => $s->id,
                'edition_id' => $s->edition_id,
                'image_url' => $s->image_url,
                'thumbnail_url' => $s->thumbnail_url,
                'image_width' => $s->image_width,
                'image_height' => $s->image_height,
                'caption' => $s->caption,
                'is_anonymous' => (bool) $s->is_anonymous,
                'is_hidden' => (bool) $s->is_hidden,
                'author' => [
                    'id' => $s->user?->id,
                    'name' => $s->user?->name ?? 'Unknown',
                    'email' => $s->user?->email ?? '',
                    'avatar_url' => $s->user?->avatar_url,
                ],
                'created_at' => $s->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'submissions' => $submissions,
        ]);
    }

    public function toggleSubmissionVisibility(Request $request, Submission $submission): JsonResponse
    {
        $validated = $request->validate([
            'is_hidden' => ['sometimes', 'boolean'],
        ]);

        $nextHidden = array_key_exists('is_hidden', $validated)
            ? (bool) $validated['is_hidden']
            : ! $submission->is_hidden;

        $submission->update(['is_hidden' => $nextHidden]);

        return response()->json([
            'message' => $nextHidden ? 'Karya disembunyikan dari galeri.' : 'Karya ditampilkan kembali di galeri.',
            'submission' => [
                'id' => $submission->id,
                'is_hidden' => (bool) $submission->is_hidden,
            ],
        ]);
    }

    public function overrideState(Request $request, DtiEdition $edition): JsonResponse
    {
        $validated = $request->validate([
            'action' => [
                'required',
                Rule::in([
                    'open_submissions',
                    'extend_submission_deadline',
                    'close_poll_early',
                    'open_voting',
                    'close_voting_early',
                    'set_status',
                ]),
            ],
            'days' => ['sometimes', 'integer', 'min:1', 'max:30'],
            'extend' => ['sometimes', 'boolean'],
            'status' => ['required_if:action,set_status', Rule::enum(EditionStatus::class)],
        ]);

        switch ($validated['action']) {
            case 'open_submissions':
                $edition->status = EditionStatus::SubmissionOpen;
                $edition->poll_deadline = null;
                break;

            case 'extend_submission_deadline':
                $days = (int) ($validated['days'] ?? 3);
                $base = $edition->submission_deadline->isFuture()
                    ? $edition->submission_deadline->copy()
                    : now();
                $newSubmissionDeadline = $base->addDays($days);

                $edition->submission_deadline = $newSubmissionDeadline;
                if ($edition->voting_deadline->lessThanOrEqualTo($newSubmissionDeadline)) {
                    $edition->voting_deadline = $newSubmissionDeadline->copy()->addDays(3);
                }
                $edition->poll_deadline = null;
                $edition->status = EditionStatus::SubmissionOpen;
                break;

            case 'close_poll_early':
                $shouldExtend = array_key_exists('extend', $validated)
                    ? (bool) $validated['extend']
                    : (
                        $edition->extensionVotes()->where('agree_to_extend', true)->count()
                        > $edition->extensionVotes()->where('agree_to_extend', false)->count()
                    );

                if ($shouldExtend) {
                    $newSubmissionDeadline = now()->addDays(3);
                    $edition->submission_deadline = $newSubmissionDeadline;
                    if ($edition->voting_deadline->lessThanOrEqualTo($newSubmissionDeadline)) {
                        $edition->voting_deadline = $newSubmissionDeadline->copy()->addDays(3);
                    }
                    $edition->status = EditionStatus::SubmissionOpen;
                } else {
                    $edition->status = EditionStatus::VotingOpen;
                }
                $edition->poll_deadline = null;
                break;

            case 'open_voting':
                $edition->status = EditionStatus::VotingOpen;
                $edition->poll_deadline = null;
                break;

            case 'close_voting_early':
                $edition->status = EditionStatus::Completed;
                if ($edition->voting_deadline->isFuture()) {
                    $edition->voting_deadline = now();
                }
                break;

            case 'set_status':
                $edition->status = EditionStatus::from($validated['status']);
                break;
        }

        $edition->save();

        return response()->json([
            'message' => 'Status edisi berhasil diubah oleh Admin.',
            'edition' => new DtiEditionResource($edition->fresh()),
        ]);
    }

    private function generateUniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'dti-edition';
        $slug = $base;
        $counter = 2;

        while (DtiEdition::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
