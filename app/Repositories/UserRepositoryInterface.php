<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Data\Auth\RegisterUserData;
use App\Models\User;

interface UserRepositoryInterface
{
    /**
     * 新規ユーザーを作成
     */
    public function create(RegisterUserData $data): User;
}
