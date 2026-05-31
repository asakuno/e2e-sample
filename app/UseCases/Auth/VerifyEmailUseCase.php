<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Verified;

/**
 * メール認証完了ユースケース
 */
final class VerifyEmailUseCase
{
    /**
     * メール認証を完了する
     *
     * @return bool 認証が新たに完了した場合true
     */
    public function execute(User $user): bool
    {
        if ($user->hasVerifiedEmail()) {
            return false;
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        return true;
    }
}
