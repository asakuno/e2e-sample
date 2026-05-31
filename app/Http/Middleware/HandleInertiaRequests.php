<?php

namespace App\Http\Middleware;

use App\Data\Auth\AuthenticatedUserData;
use Illuminate\Http\Request;
use Inertia\Middleware;

/**
 * Inertia.js リクエスト/レスポンス処理ミドルウェア
 */
class HandleInertiaRequests extends Middleware
{
    /**
     * ルートテンプレート
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Inertia バージョン管理
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * 全ページに共有するデータ
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user()
                    ? AuthenticatedUserData::from($request->user())
                    : null,
            ],
        ];
    }
}
