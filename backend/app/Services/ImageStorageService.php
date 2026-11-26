<?php

namespace App\Services;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Format;
use Intervention\Image\ImageManager;

class ImageStorageService
{
    private const THUMBNAIL_MAX_WIDTH = 900;

    private const THUMBNAIL_QUALITY = 82;

    private function diskName(): string
    {
        return (string) config('filesystems.media_disk', 's3');
    }

    private function disk(): Filesystem
    {
        return Storage::disk($this->diskName());
    }

    private function putPublic(string $path, string $contents, string $contentType): void
    {
        $diskName = $this->diskName();
        $options = config("filesystems.disks.{$diskName}.driver") === 's3'
            ? ['visibility' => 'public', 'ContentType' => $contentType]
            : ['visibility' => 'public'];

        $this->disk()->put($path, $contents, $options);
    }

    /**
     * Store original lossless submission image and generate lightweight WebP grid thumbnail.
     *
     * @return array{
     *     image_url: string,
     *     thumbnail_url: string,
     *     image_path: string,
     *     thumbnail_path: string,
     *     image_width: int|null,
     *     image_height: int|null
     * }
     */
    public function uploadSubmissionImage(UploadedFile $file, int $editionId, int $userId): array
    {
        $uuid = (string) Str::uuid();
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'png');
        if ($extension === 'jpeg') {
            $extension = 'jpg';
        }

        $originalPath = "editions/{$editionId}/submissions/{$userId}/{$uuid}.{$extension}";
        $thumbnailPath = "editions/{$editionId}/thumbnails/{$userId}/{$uuid}.webp";

        $manager = ImageManager::usingDriver(GdDriver::class);
        $image = $manager->decodePath($file->getRealPath());
        $image->orient();

        $width = $image->width();
        $height = $image->height();

        // Store the uncompressed/original file bytes directly without re-encoding.
        $originalContents = file_get_contents($file->getRealPath());
        $this->putPublic(
            $originalPath,
            $originalContents,
            $file->getMimeType() ?: 'application/octet-stream',
        );

        // Generate aspect-preserving lightweight WebP preview for masonry grid.
        $image->scaleDown(width: self::THUMBNAIL_MAX_WIDTH);
        $thumbnailEncoded = $image->encodeUsingFormat(Format::WEBP, quality: self::THUMBNAIL_QUALITY);

        $this->putPublic($thumbnailPath, (string) $thumbnailEncoded, 'image/webp');

        $disk = $this->disk();

        return [
            'image_url' => $disk->url($originalPath),
            'thumbnail_url' => $disk->url($thumbnailPath),
            'image_path' => $originalPath,
            'thumbnail_path' => $thumbnailPath,
            'image_width' => $width,
            'image_height' => $height,
        ];
    }

    /**
     * Store edition reference image on configured media disk (R2/S3 in prod).
     *
     * @return array{url: string, path: string}
     */
    public function uploadReferenceImage(UploadedFile $file, int $editionId): array
    {
        $uuid = (string) Str::uuid();
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'png');
        $path = "editions/{$editionId}/reference/{$uuid}.{$extension}";

        $this->putPublic(
            $path,
            file_get_contents($file->getRealPath()),
            $file->getMimeType() ?: 'application/octet-stream',
        );

        return [
            'url' => $this->disk()->url($path),
            'path' => $path,
        ];
    }

    /**
     * Store user profile picture resized cleanly as square WebP avatar.
     *
     * @return array{url: string, path: string}
     */
    public function uploadAvatar(UploadedFile $file, int $userId): array
    {
        $uuid = (string) Str::uuid();
        $path = "avatars/{$userId}/{$uuid}.webp";

        $manager = ImageManager::usingDriver(GdDriver::class);
        $image = $manager->decodePath($file->getRealPath());
        $image->orient();
        $image->cover(400, 400);
        $encoded = $image->encodeUsingFormat(Format::WEBP, quality: 85);

        $this->putPublic($path, (string) $encoded, 'image/webp');

        return [
            'url' => $this->disk()->url($path),
            'path' => $path,
        ];
    }

    /**
     * Delete one or more stored object keys from S3/R2.
     *
     * @param  array<int, string|null>  $paths
     */
    public function deletePaths(array $paths): void
    {
        $validPaths = array_values(array_filter($paths, fn (?string $path) => is_string($path) && $path !== ''));

        if ($validPaths !== []) {
            $this->disk()->delete($validPaths);
        }
    }

    public function readContents(string $path): ?string
    {
        $disk = $this->disk();
        if (! $disk->exists($path)) {
            return null;
        }

        return $disk->get($path);
    }

    public function detectMimeType(string $path): string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match ($ext) {
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };
    }
}
