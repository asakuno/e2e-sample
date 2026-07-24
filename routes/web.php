<?php

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
});
