<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\UseCases\Auth\ResetPasswordUseCase;
use App\UseCases\Auth\SendPasswordResetLinkUseCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetPageController extends Controller
{
    public function __construct(
        private readonly SendPasswordResetLinkUseCase $sendPasswordResetLinkUseCase,
        private readonly ResetPasswordUseCase $resetPasswordUseCase,
    ) {}

    public function showForgotPassword(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    public function sendPasswordResetLink(ForgotPasswordRequest $request): RedirectResponse
    {
        $this->sendPasswordResetLinkUseCase->execute($request->toForgotPasswordData());

        return back()->with('status', __('passwords.sent'));
    }

    public function showResetPassword(Request $request, string $token): Response
    {
        return Inertia::render('Auth/ResetPassword', [
            'email' => (string) $request->query('email', ''),
            'token' => $token,
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): RedirectResponse
    {
        $this->resetPasswordUseCase->execute($request->toResetPasswordData());

        return redirect()->route('login')->with('status', __('passwords.reset'));
    }
}
