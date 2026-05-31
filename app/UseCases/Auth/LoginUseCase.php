<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Data\Auth\AuthenticatedUserData;
use App\Data\Auth\LoginData;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

final class LoginUseCase
{
    /**
     * ログイン処理を実行
     *
     * @throws ValidationException 認証失敗時
     */
    public function execute(LoginData $data): AuthenticatedUserData
    {
        $authenticated = Auth::attempt([
            'email' => $data->email,
            'password' => $data->password,
        ]);

        if (! $authenticated) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        return AuthenticatedUserData::from(Auth::user());
    }
}
