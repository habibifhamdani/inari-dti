<?php

namespace App\Http\Resources;

use App\Enums\EditionStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Submission
 */
class SubmissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $isCompleted = $this->edition?->status === EditionStatus::Completed;
        $isOwn = $viewer !== null && $viewer->id === $this->user_id;
        $shouldMask = $this->is_anonymous && ! $isCompleted;

        return [
            'id' => $this->id,
            'edition_id' => $this->edition_id,
            'image_url' => $this->image_url,
            'thumbnail_url' => $this->thumbnail_url,
            'image_width' => $this->image_width,
            'image_height' => $this->image_height,
            'caption' => $this->caption,
            'is_anonymous' => (bool) $this->is_anonymous,
            'is_hidden' => (bool) $this->is_hidden,
            'is_own_submission' => $isOwn,
            'author' => $shouldMask
                ? [
                    'id' => null,
                    'name' => 'Anonymous',
                    'avatar_url' => null,
                ]
                : [
                    'id' => $this->user?->id,
                    'name' => $this->user?->name ?? 'Unknown Artist',
                    'avatar_url' => $this->user?->avatar_url,
                ],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
