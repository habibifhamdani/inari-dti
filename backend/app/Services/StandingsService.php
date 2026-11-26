<?php

namespace App\Services;

use App\Models\DtiEdition;
use App\Models\Submission;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StandingsService
{
    /**
     * Compute full final standings, Top 3 Winners, and Ranks 4-6 Honorable Mentions.
     *
     * @return array{
     *     winners: array<int, array<string, mixed>>,
     *     honorable_mentions: array<int, array<string, mixed>>,
     *     standings: array<int, array<string, mixed>>
     * }
     */
    public function getStandings(DtiEdition $edition): array
    {
        /** @var Collection<int, Submission> $rows */
        $rows = Submission::query()
            ->select([
                'submissions.id',
                'submissions.edition_id',
                'submissions.user_id',
                'submissions.image_url',
                'submissions.thumbnail_url',
                'submissions.image_width',
                'submissions.image_height',
                'submissions.caption',
                'submissions.is_anonymous',
                'submissions.created_at',
                DB::raw('COALESCE(SUM(votes.tier_points), 0) as total_points'),
                DB::raw('COALESCE(SUM(CASE WHEN votes.tier_points = 5 THEN 1 ELSE 0 END), 0) as netherite_count'),
                DB::raw('COALESCE(SUM(CASE WHEN votes.tier_points = 4 THEN 1 ELSE 0 END), 0) as diamond_count'),
                DB::raw('COALESCE(SUM(CASE WHEN votes.tier_points = 3 THEN 1 ELSE 0 END), 0) as gold_count'),
                DB::raw('COALESCE(SUM(CASE WHEN votes.tier_points = 2 THEN 1 ELSE 0 END), 0) as iron_count'),
                DB::raw('COALESCE(SUM(CASE WHEN votes.tier_points = 1 THEN 1 ELSE 0 END), 0) as copper_count'),
                DB::raw('COUNT(votes.id) as vote_count'),
            ])
            ->leftJoin('votes', 'votes.submission_id', '=', 'submissions.id')
            ->with('user:id,name,avatar_url')
            ->where('submissions.edition_id', $edition->id)
            ->where('submissions.is_hidden', false)
            ->groupBy([
                'submissions.id',
                'submissions.edition_id',
                'submissions.user_id',
                'submissions.image_url',
                'submissions.thumbnail_url',
                'submissions.image_width',
                'submissions.image_height',
                'submissions.caption',
                'submissions.is_anonymous',
                'submissions.created_at',
            ])
            ->orderByDesc('total_points')
            ->orderByDesc('netherite_count')
            ->orderByDesc('diamond_count')
            ->orderByDesc('gold_count')
            ->orderByDesc('iron_count')
            ->orderBy('submissions.created_at')
            ->get();

        $standings = $rows->values()->map(function (Submission $submission, int $index): array {
            $rank = $index + 1;

            return [
                'rank' => $rank,
                'submission_id' => $submission->id,
                'image_url' => $submission->image_url,
                'thumbnail_url' => $submission->thumbnail_url,
                'image_width' => $submission->image_width,
                'image_height' => $submission->image_height,
                'caption' => $submission->caption,
                'was_anonymous' => (bool) $submission->is_anonymous,
                'created_at' => $submission->created_at?->toIso8601String(),
                'author' => [
                    'id' => $submission->user?->id,
                    'name' => $submission->user?->name ?? 'Unknown Artist',
                    'avatar_url' => $submission->user?->avatar_url,
                ],
                'total_points' => (int) $submission->getAttribute('total_points'),
                'vote_count' => (int) $submission->getAttribute('vote_count'),
                'breakdown' => [
                    'netherite' => (int) $submission->getAttribute('netherite_count'),
                    'diamond' => (int) $submission->getAttribute('diamond_count'),
                    'gold' => (int) $submission->getAttribute('gold_count'),
                    'iron' => (int) $submission->getAttribute('iron_count'),
                    'copper' => (int) $submission->getAttribute('copper_count'),
                ],
            ];
        })->all();

        return [
            'winners' => array_slice($standings, 0, 3),
            'honorable_mentions' => array_slice($standings, 3, 3),
            'standings' => $standings,
        ];
    }
}
