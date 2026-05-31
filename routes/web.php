<?php

use App\Http\Controllers\Web\AuthPageController;
use App\Http\Controllers\Web\DashboardPageController;
use App\Http\Controllers\Web\EmailVerificationPageController;
use App\Http\Controllers\Web\NewsPageController;
use App\Http\Controllers\Web\StocksPageController;
use App\Http\Controllers\Web\WatchlistPageController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// 未認証ユーザー用（guestミドルウェア）
Route::middleware(['guest', 'precognitive'])->group(function () {
    Route::get('/login', [AuthPageController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthPageController::class, 'login'])
        ->middleware('throttle:5,1');
    Route::get('/register', [AuthPageController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthPageController::class, 'register']);
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
    Route::get('/watchlist', WatchlistPageController::class)->name('watchlist.index');
    Route::get('/news', NewsPageController::class)->name('news.index');
});
