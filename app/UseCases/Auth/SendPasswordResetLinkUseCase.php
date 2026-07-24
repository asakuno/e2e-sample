<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Data\Auth\ForgotPasswordData;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

final class SendPasswordResetLinkUseCase
{
    public function execute(ForgotPasswordData $data): void
    {
        $status = Password::sendResetLink([
            'email' => $data->email,
        ]);

        if (in_array($status, [Password::RESET_LINK_SENT, Password::INVALID_USER], true)) {
            return;
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }
}
