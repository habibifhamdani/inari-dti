<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreWhitelistedEmailRequest;
use App\Models\WhitelistedEmail;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class WhitelistedEmailController extends Controller
{
    public function index(): JsonResponse
    {
        $emails = WhitelistedEmail::query()
            ->with('addedBy:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (WhitelistedEmail $entry): array => [
                'id' => $entry->id,
                'email' => $entry->email,
                'added_by' => $entry->addedBy?->name,
                'created_at' => $entry->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'whitelisted_emails' => $emails,
        ]);
    }

    public function store(StoreWhitelistedEmailRequest $request): JsonResponse
    {
        $entry = WhitelistedEmail::query()->create([
            'email' => $request->validated('email'),
            'added_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Email berhasil ditambahkan ke whitelist.',
            'whitelisted_email' => [
                'id' => $entry->id,
                'email' => $entry->email,
                'added_by' => $request->user()->name,
                'created_at' => $entry->created_at?->toIso8601String(),
            ],
        ], Response::HTTP_CREATED);
    }

    public function destroy(WhitelistedEmail $whitelistedEmail): JsonResponse
    {
        $whitelistedEmail->delete();

        return response()->json([
            'message' => 'Email dihapus dari whitelist.',
        ]);
    }
}
