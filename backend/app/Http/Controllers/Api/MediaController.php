<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ImageStorageService;
use Symfony\Component\HttpFoundation\Response;

class MediaController extends Controller
{
    public function show(string $path, ImageStorageService $storageService): Response
    {
        $normalized = ltrim($path, '/');

        if (
            $normalized === ''
            || str_contains($normalized, '..')
            || ! preg_match('/^(editions|avatars)\/[a-zA-Z0-9\/._-]+$/', $normalized)
        ) {
            abort(404);
        }

        $stream = $storageService->readStream($normalized);

        if (! is_resource($stream)) {
            abort(404);
        }

        $mimeType = $storageService->detectMimeType($normalized);

        return response()->stream(
            function () use ($stream): void {
                fpassthru($stream);
                if (is_resource($stream)) {
                    fclose($stream);
                }
            },
            200,
            [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=31536000, immutable',
            ],
        );
    }
}
