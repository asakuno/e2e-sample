<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use Illuminate\Support\Facades\Auth;

final class LogoutUseCase
{
    /**
     * ログアウト処理を実行
     */
    public function execute(): void
    {
        Auth::guard('web')->logout();
    }
}
