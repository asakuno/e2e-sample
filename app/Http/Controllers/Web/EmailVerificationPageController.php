<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\EmailVerificationRequest;
use App\UseCases\Auth\SendEmailVerificationUseCase;
use App\UseCases\Auth\VerifyEmailUseCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * メール認証ページコントローラー
 */
class EmailVerificationPageController extends Controller
{
    public function __construct(
        private readonly SendEmailVerificationUseCase $sendEmailVerificationUseCase,
        private readonly VerifyEmailUseCase $verifyEmailUseCase,
    ) {}

    /**
     * メール認証待ちページ表示
     */
    public function notice(Request $request): Response|RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended('/dashboard');
        }

        return Inertia::render('Auth/VerifyEmail', [
            'status' => session('status'),
        ]);
    }

    /**
     * メール認証処理
     */
    public function verify(EmailVerificationRequest $request): RedirectResponse
    {
        $this->verifyEmailUseCase->execute($request->user());

        return redirect()->intended('/dashboard?verified=1');
    }

    /**
     * 認証メール再送
     */
    public function send(Request $request): RedirectResponse
    {
        $this->sendEmailVerificationUseCase->execute($request->user());

        return back()->with('status', 'verification-link-sent');
    }
}
