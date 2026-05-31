<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Data\Auth\AuthenticatedUserData;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Auth;

final class GetAuthenticatedUserUseCase
{
    /**
     * 現在認証済みのユーザー情報を取得
     *
     * @throws AuthenticationException 未認証の場合
     */
    public function execute(): AuthenticatedUserData
    {
        $user = Auth::user();

        if ($user === null) {
            throw new AuthenticationException('Unauthenticated.');
        }

        return AuthenticatedUserData::from($user);
    }
}
