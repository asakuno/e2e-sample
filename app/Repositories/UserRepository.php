<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Auth\RegisterUserData;
use App\Models\User;

/**
 * ユーザーリポジトリ実装
 */
final class UserRepository implements UserRepositoryInterface
{
    /**
     * 新規ユーザーを作成
     *
     * パスワードはUser Modelのhashedキャストにより自動ハッシュ化される
     */
    public function create(RegisterUserData $data): User
    {
        return User::create($data->toArray());
    }
}
