# DESIGN: ログイン画面 バックエンド補完（Web Controller）

## 概要

Inertia.js用のWeb Controller層を追加し、既存のUseCase（LoginUseCase, LogoutUseCase）を再利用する。
既存のAPI Controller（`AuthController`）は変更しない。

## 既存コード（再利用対象）

| コンポーネント | パス | 状態 |
|-------------|------|------|
| LoginUseCase | `app/UseCases/Auth/LoginUseCase.php` | 実装済み |
| LogoutUseCase | `app/UseCases/Auth/LogoutUseCase.php` | 実装済み |
| GetAuthenticatedUserUseCase | `app/UseCases/Auth/GetAuthenticatedUserUseCase.php` | 実装済み |
| LoginRequest | `app/Http/Requests/Auth/LoginRequest.php` | 実装済み（そのまま流用） |
| LoginData (DTO) | `app/Data/Auth/LoginData.php` | 実装済み |
| AuthenticatedUserData (DTO) | `app/Data/Auth/AuthenticatedUserData.php` | 実装済み |
| AuthenticatedUserResource | `app/Http/Resources/Auth/AuthenticatedUserResource.php` | 実装済み |

## 新規作成ファイル

| ファイル | 層 | 説明 |
|---------|-----|------|
| `app/Http/Controllers/Web/AuthPageController.php` | Presentation | Inertia用Web Controller |
| `tests/Feature/Http/Controllers/Web/AuthPageControllerTest.php` | Test | Web Controllerのテスト |

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `routes/web.php` | ログイン関連ルート追加 |

---

## 実装詳細

### 1. AuthPageController

```php
// app/Http/Controllers/Web/AuthPageController.php
namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\UseCases\Auth\LoginUseCase;
use App\UseCases\Auth\LogoutUseCase;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class AuthPageController extends Controller
{
    public function __construct(
        private readonly LoginUseCase $loginUseCase,
        private readonly LogoutUseCase $logoutUseCase,
    ) {}

    /**
     * ログインページ表示
     * GET /login
     */
    public function showLogin(): Response
    {
        return Inertia::render('Auth/Login');
    }

    /**
     * ログイン処理
     * POST /login
     */
    public function login(LoginRequest $request): RedirectResponse
    {
        $data = $request->toLoginData();
        $this->loginUseCase->execute($data, $request);

        return redirect()->intended('/dashboard');
    }

    /**
     * ログアウト処理
     * POST /logout
     */
    public function logout(): RedirectResponse
    {
        $this->logoutUseCase->execute();

        return redirect('/login');
    }
}
```

### 2. routes/web.php

```php
use App\Http\Controllers\Web\AuthPageController;

// 未認証ユーザー用（guestミドルウェア）
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthPageController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthPageController::class, 'login']);
});

// 認証済みユーザー用
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthPageController::class, 'logout'])->name('logout');
});
```

---

## 実装手順（TDD: RED -> GREEN -> REFACTOR）

### Phase 2-1: AuthPageController テスト作成（RED）

1. `tests/Feature/Http/Controllers/Web/AuthPageControllerTest.php` を作成
2. テストケース:
   - `test_showLogin_returns_inertia_response`: GET /login が Inertia レスポンスを返す
   - `test_showLogin_redirects_authenticated_user`: 認証済みユーザーはリダイレクトされる（guest middleware）
   - `test_login_with_valid_credentials_redirects_to_dashboard`: 正しい認証情報でダッシュボードへリダイレクト
   - `test_login_with_invalid_credentials_returns_validation_error`: 不正な認証情報でバリデーションエラー
   - `test_login_with_missing_email_returns_validation_error`: メール未入力でバリデーションエラー
   - `test_login_with_missing_password_returns_validation_error`: パスワード未入力でバリデーションエラー
   - `test_logout_redirects_to_login`: ログアウト後ログインページへリダイレクト
   - `test_logout_invalidates_session`: ログアウト後セッションが無効化される
   - `test_logout_requires_authentication`: 未認証ユーザーのログアウトはリダイレクト

### Phase 2-2: AuthPageController 実装（GREEN）

1. `app/Http/Controllers/Web/AuthPageController.php` を作成
2. `routes/web.php` にルートを追加
3. テスト実行 -> 全テストパス

### Phase 2-3: REFACTOR

1. コードスタイル確認（Pint）
2. 静的解析（PHPStan）
3. 依存関係チェック（deptrac）

---

## アーキテクチャ準拠確認

| 項目 | 評価 |
|------|------|
| **層配置**: Web Controller は Presentation 層 | OK |
| **UseCase 再利用**: 既存 LoginUseCase/LogoutUseCase をそのまま使用 | OK |
| **Controller にビジネスロジックなし**: UseCase に委譲 | OK |
| **FormRequest 再利用**: 既存 LoginRequest をそのまま使用 | OK |
| **依存方向**: Controller -> UseCase -> Repository（一方向） | OK |
| **Web/API 分離**: Web Controller は Inertia レスポンス、API Controller は JSON | OK |
| **命名規則**: `AuthPageController`（Web Controller 命名規則準拠） | OK |
