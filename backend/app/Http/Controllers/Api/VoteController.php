<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Vote\StoreExtensionVoteRequest;
use App\Http\Requests\Vote\SyncVotesRequest;
use App\Models\DtiEdition;
use App\Models\ExtensionVote;
use App\Models\Submission;
use App\Models\Vote;
use App\Services\EditionTransitionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class VoteController extends Controller
{
    public function syncVotes(
        SyncVotesRequest $request,
        DtiEdition $edition,
        EditionTransitionService $transitionService,
    ): JsonResponse {
        $user = $request->user();

        if ($user->isVotingBlocked()) {
            $blacklist = $user->blacklist()->first();

            return response()->json([
                'message' => 'Akun kamu sedang dibatasi dan tidak diperbolehkan melakukan voting.',
                'blacklist_level' => $blacklist?->level?->value,
                'reason' => $blacklist?->reason,
            ], Response::HTTP_FORBIDDEN);
        }

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Verifikasi email kamu terlebih dahulu sebelum melakukan voting.',
            ], Response::HTTP_FORBIDDEN);
        }

        $edition = $transitionService->evaluate($edition);

        if (! $edition->isVotingWindowActive()) {
            return response()->json([
                'message' => 'Voting untuk edisi ini tidak sedang dibuka.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $ballot = $request->validated('votes');
        $submissionIds = array_column($ballot, 'submission_id');

        $submissions = Submission::query()
            ->where('edition_id', $edition->id)
            ->where('is_hidden', false)
            ->whereIn('id', $submissionIds)
            ->get()
            ->keyBy('id');

        if ($submissions->count() !== count($submissionIds)) {
            return response()->json([
                'message' => 'Terdapat karya yang tidak valid atau disembunyikan pada edisi ini.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        foreach ($submissions as $submission) {
            if ($submission->user_id === $user->id) {
                return response()->json([
                    'message' => 'Tidak diperbolehkan melakukan vote pada karya milik sendiri.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        DB::transaction(function () use ($edition, $user, $ballot): void {
            Vote::query()
                ->where('edition_id', $edition->id)
                ->where('voter_id', $user->id)
                ->delete();

            $now = now();
            $rows = array_map(fn (array $item): array => [
                'edition_id' => $edition->id,
                'voter_id' => $user->id,
                'submission_id' => (int) $item['submission_id'],
                'tier_points' => (int) $item['tier_points'],
                'created_at' => $now,
                'updated_at' => $now,
            ], $ballot);

            Vote::query()->insert($rows);
        });

        $savedVotes = Vote::query()
            ->where('edition_id', $edition->id)
            ->where('voter_id', $user->id)
            ->orderByDesc('tier_points')
            ->get(['submission_id', 'tier_points'])
            ->map(fn (Vote $vote) => [
                'submission_id' => $vote->submission_id,
                'tier_points' => (int) $vote->tier_points,
            ])
            ->values()
            ->all();

        return response()->json([
            'message' => 'Ballot voting kamu berhasil disimpan!',
            'my_votes' => $savedVotes,
        ]);
    }

    public function voteExtension(
        StoreExtensionVoteRequest $request,
        DtiEdition $edition,
        EditionTransitionService $transitionService,
    ): JsonResponse {
        $user = $request->user();

        if ($user->isVotingBlocked()) {
            $blacklist = $user->blacklist()->first();

            return response()->json([
                'message' => 'Akun kamu sedang dibatasi dan tidak diperbolehkan melakukan voting.',
                'blacklist_level' => $blacklist?->level?->value,
                'reason' => $blacklist?->reason,
            ], Response::HTTP_FORBIDDEN);
        }

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Verifikasi email kamu terlebih dahulu sebelum ikut polling.',
            ], Response::HTTP_FORBIDDEN);
        }

        $edition = $transitionService->evaluate($edition);

        if (! $edition->isExtensionPollActive()) {
            return response()->json([
                'message' => 'Polling perpanjangan deadline tidak sedang dibuka untuk edisi ini.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        ExtensionVote::query()->updateOrCreate(
            [
                'edition_id' => $edition->id,
                'user_id' => $user->id,
            ],
            [
                'agree_to_extend' => $request->boolean('agree_to_extend'),
            ]
        );

        $agree = $edition->extensionVotes()->where('agree_to_extend', true)->count();
        $disagree = $edition->extensionVotes()->where('agree_to_extend', false)->count();

        return response()->json([
            'message' => 'Suara polling perpanjangan berhasil dicatat.',
            'extension_poll' => [
                'agree_count' => $agree,
                'disagree_count' => $disagree,
                'total_votes' => $agree + $disagree,
                'user_vote' => $request->boolean('agree_to_extend'),
            ],
        ]);
    }
}
