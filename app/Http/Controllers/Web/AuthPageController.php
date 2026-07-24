<?php

declare(strict_types=1);

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\UseCases\Auth\LoginUseCase;
use App\UseCases\Auth\LogoutUseCase;
use App\UseCases\Auth\RegisterUserUseCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * 認証関連ページコントローラー
 */
class AuthPageController extends Controller
{
    public function __construct(
        private readonly LoginUseCase $loginUseCase,
        private readonly LogoutUseCase $logoutUseCase,
        private readonly RegisterUserUseCase $registerUserUseCase,
    ) {}

    /**
     * ログインページ表示
     */
    public function showLogin(): Response
    {
        return Inertia::render('Auth/Login', [
            'status' => session('status'),
        ]);
    }

    /**
     * ログイン処理
     */
    public function login(LoginRequest $request): RedirectResponse
    {
        $data = $request->toLoginData();
        $this->loginUseCase->execute($data);

        // セッションフィクス化攻撃対策
        $request->session()->regenerate();

        return redirect()->intended('/dashboard');
    }

    /**
     * 登録ページ表示
     */
    public function showRegister(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * 登録処理
     */
    public function register(RegisterRequest $request): RedirectResponse
    {
        $data = $request->toRegisterUserData();
        $this->registerUserUseCase->execute($data);

        // セッション再生成（セッションフィクス化攻撃対策）
        $request->session()->regenerate();

        return redirect()->route('verification.notice');
    }

    /**
     * ログアウト処理
     */
    public function logout(Request $request): RedirectResponse
    {
        $this->logoutUseCase->execute();

        // セッション無効化・CSRF トークン再生成
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
