<?php

use App\Http\Controllers\Api\Admin\BlacklistController;
use App\Http\Controllers\Api\Admin\EditionController as AdminEditionController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\WhitelistedEmailController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EditionController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SubmissionController;
use App\Http\Controllers\Api\VoteController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'inari-dti-api']));
Route::get('/media/{path}', [MediaController::class, 'show'])->where('path', '.*');

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:15,1');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:6,1');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1');

    Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware(['signed', 'throttle:10,1'])
        ->name('verification.verify');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);

        Route::middleware('not.banned')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])
                ->middleware('throttle:6,1')
                ->name('verification.send');
        });
    });
});

Route::middleware(['auth:sanctum', 'not.banned'])->group(function () {
    Route::post('/profile', [ProfileController::class, 'updateProfile']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
});

Route::middleware(['dti.transitions', 'sanctum.optional'])->group(function () {
    Route::get('/editions', [EditionController::class, 'index']);
    Route::get('/editions/active', [EditionController::class, 'active']);
    Route::get('/editions/{slug}', [EditionController::class, 'show']);
    Route::get('/editions/{edition}/submissions/{submission}/download', [EditionController::class, 'downloadSubmission']);
    Route::get('/editions/{edition}/download-all', [EditionController::class, 'downloadAll']);
});

Route::middleware(['auth:sanctum', 'not.banned', 'dti.transitions'])->group(function () {
    Route::post('/editions/{edition}/submissions', [SubmissionController::class, 'store']);
    Route::post('/editions/{edition}/votes', [VoteController::class, 'syncVotes']);
    Route::post('/editions/{edition}/extension-vote', [VoteController::class, 'voteExtension']);
});

Route::prefix('admin')
    ->middleware(['auth:sanctum', 'not.banned', 'admin', 'dti.transitions'])
    ->group(function () {
        Route::get('/editions', [AdminEditionController::class, 'index']);
        Route::post('/editions', [AdminEditionController::class, 'store']);
        Route::match(['put', 'patch', 'post'], '/editions/{edition}', [AdminEditionController::class, 'update']);
        Route::delete('/editions/{edition}', [AdminEditionController::class, 'destroy'])
            ->middleware('superadmin');

        Route::get('/editions/{edition}/submissions', [AdminEditionController::class, 'submissions']);
        Route::patch('/submissions/{submission}/visibility', [AdminEditionController::class, 'toggleSubmissionVisibility']);
        Route::post('/editions/{edition}/state-override', [AdminEditionController::class, 'overrideState']);

        Route::get('/whitelisted-emails', [WhitelistedEmailController::class, 'index']);
        Route::post('/whitelisted-emails', [WhitelistedEmailController::class, 'store']);
        Route::delete('/whitelisted-emails/{whitelistedEmail}', [WhitelistedEmailController::class, 'destroy']);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::patch('/users/{user}/role', [AdminUserController::class, 'updateRole']);

        Route::get('/blacklist', [BlacklistController::class, 'index']);
        Route::post('/blacklist', [BlacklistController::class, 'store']);
        Route::delete('/blacklist/{blacklistedUser}', [BlacklistController::class, 'destroy']);
    });
