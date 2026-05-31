<?php

declare(strict_types=1);

namespace App\UseCases\Auth;

use App\Data\Auth\AuthenticatedUserData;
use App\Data\Auth\RegisterUserData;
use App\Repositories\UserRepositoryInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * ユーザー新規登録ユースケース
 */
final class RegisterUserUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
    ) {}

    /**
     * ユーザー新規登録処理を実行
     */
    public function execute(RegisterUserData $data): AuthenticatedUserData
    {
        return DB::transaction(function () use ($data) {
            // ユーザー作成
            $user = $this->userRepository->create($data);

            // 自動ログイン
            Auth::login($user);

            // メール認証通知を送信
            $user->sendEmailVerificationNotification();

            return AuthenticatedUserData::from($user);
        });
    }
}
