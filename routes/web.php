<?php

use App\Http\Controllers\Web\AnalysisBatchController;
use App\Http\Controllers\Web\AnalysisExportController;
use App\Http\Controllers\Web\AnalysisImportController;
use App\Http\Controllers\Web\AnalysisPageController;
use App\Http\Controllers\Web\AnalysisReplacementImportController;
use App\Http\Controllers\Web\AuthPageController;
use App\Http\Controllers\Web\DashboardPageController;
use App\Http\Controllers\Web\EmailVerificationPageController;
use App\Http\Controllers\Web\NewsPageController;
use App\Http\Controllers\Web\PasswordResetPageController;
use App\Http\Controllers\Web\StocksPageController;
use App\Http\Controllers\Web\WatchlistPageController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard');

// 未認証ユーザー用（guestミドルウェア）
Route::middleware(['guest', 'precognitive'])->group(function () {
    Route::get('/login', [AuthPageController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthPageController::class, 'login'])
        ->middleware('throttle:5,1');
    Route::get('/register', [AuthPageController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthPageController::class, 'register'])
        ->middleware('throttle:register');
    Route::get('/forgot-password', [PasswordResetPageController::class, 'showForgotPassword'])
        ->name('password.request');
    Route::post('/forgot-password', [PasswordResetPageController::class, 'sendPasswordResetLink'])
        ->middleware('throttle:5,1')
        ->name('password.email');
    Route::get('/reset-password/{token}', [PasswordResetPageController::class, 'showResetPassword'])
        ->name('password.reset');
    Route::post('/reset-password', [PasswordResetPageController::class, 'resetPassword'])
        ->middleware('throttle:5,1')
        ->name('password.store');
});

// 認証済み（メール未認証可）ユーザー用
Route::middleware(['auth'])->group(function () {
    Route::get('/email/verify', [EmailVerificationPageController::class, 'notice'])
        ->name('verification.notice');

    Route::get('/email/verify/{id}/{hash}', [EmailVerificationPageController::class, 'verify'])
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('/email/verification-notification', [EmailVerificationPageController::class, 'send'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::post('/logout', [AuthPageController::class, 'logout'])->name('logout');
});

// 認証済み + メール認証済みユーザー用
Route::middleware(['auth', 'verified', 'precognitive'])->group(function () {
    Route::get('/dashboard', DashboardPageController::class)->name('dashboard');
    Route::get('/stocks', StocksPageController::class)->name('stocks.index');
    Route::get('/stocks/{stock}', [StocksPageController::class, 'show'])
        ->whereNumber('stock')
        ->name('stocks.show');
    Route::redirect('/watchlist', '/watchlists');
    Route::get('/watchlists', WatchlistPageController::class)->name('watchlist.index');
    Route::post('/watchlists', [WatchlistPageController::class, 'store'])->name('watchlist.store');
    Route::patch('/watchlists/{watchlist}', [WatchlistPageController::class, 'update'])
        ->whereNumber('watchlist')
        ->name('watchlist.update');
    Route::delete('/watchlists/{watchlist}', [WatchlistPageController::class, 'destroy'])
        ->whereNumber('watchlist')
        ->name('watchlist.destroy');
    Route::get('/news', NewsPageController::class)->name('news.index');

    Route::get('/analysis', [AnalysisPageController::class, 'index'])
        ->name('analysis.index');
    Route::get('/analysis/create', [AnalysisPageController::class, 'create'])
        ->name('analysis.create');
    Route::post('/analysis', [AnalysisBatchController::class, 'store'])
        ->name('analysis.store');
    Route::get('/analysis/{analysisBatch}', [AnalysisPageController::class, 'show'])
        ->name('analysis.show');
    Route::post('/analysis/{analysisBatch}/exports/copy', [AnalysisExportController::class, 'markPromptCopied'])
        ->name('analysis.exports.copy');
    Route::post('/analysis/{analysisBatch}/exports/prompt', [AnalysisExportController::class, 'downloadPrompt'])
        ->name('analysis.exports.prompt');
    Route::post('/analysis/{analysisBatch}/exports/result-template', [AnalysisExportController::class, 'downloadResultTemplate'])
        ->name('analysis.exports.result-template');
    Route::post('/analysis/{analysisBatch}/imports', [AnalysisImportController::class, 'store'])
        ->middleware('throttle:analysis-import-upload')
        ->name('analysis.imports.store');
    Route::post('/analysis/{analysisBatch}/replacement-imports', [AnalysisReplacementImportController::class, 'store'])
        ->middleware('throttle:analysis-import-upload')
        ->name('analysis.replacement-imports.store');
    Route::get('/analysis/{analysisBatch}/imports/{analysisImport}', [AnalysisPageController::class, 'importPreview'])
        ->scopeBindings()
        ->name('analysis.imports.show');
    Route::post('/analysis/{analysisBatch}/imports/{analysisImport}/reprepare', [AnalysisImportController::class, 'reprepare'])
        ->middleware('throttle:analysis-import-upload')
        ->scopeBindings()
        ->name('analysis.imports.reprepare');
    Route::post('/analysis/{analysisBatch}/imports/{analysisImport}/commit', [AnalysisImportController::class, 'commit'])
        ->scopeBindings()
        ->name('analysis.imports.commit');
    Route::post('/analysis/{analysisBatch}/imports/{analysisImport}/replace', [AnalysisImportController::class, 'replace'])
        ->scopeBindings()
        ->name('analysis.imports.replace');
});
