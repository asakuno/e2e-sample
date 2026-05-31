<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;

/**
 * メール認証通知再送ユースケース
 */
final class SendEmailVerificationUseCase
{
    /**
     * メール認証通知を再送する
     *
     * 認証済みユーザーには送信しない
     */
    public function execute(User $user): void
    {
        if ($user->hasVerifiedEmail()) {
            return;
        }

        $user->sendEmailVerificationNotification();
    }
}
