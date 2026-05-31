# ログイン機能 実装計画書

## 概要

Laravel Sanctum Cookie認証を使用したAPI認証システムの実装計画。
7層レイヤードアーキテクチャに基づく設計。

---

## アーキテクチャ概要

### 使用技術
- Laravel 12.x
- Laravel Sanctum（Cookie認証）
- spatie/laravel-data（DTO）
- PHPUnit 11（テスト）

### レイヤー構成
```
┌─────────────────────────────────────────┐
│  Presentation Layer                     │  AuthController (API)
├─────────────────────────────────────────┤
│  Request Layer                          │  LoginRequest
├─────────────────────────────────────────┤
│  UseCase Layer                          │  LoginUseCase, LogoutUseCase, GetAuthenticatedUserUseCase
├─────────────────────────────────────────┤
│  Service Layer                          │  (今回は使用しない)
├─────────────────────────────────────────┤
│  Repository Layer                       │  (今回は使用しない - Laravel標準Auth使用)
├─────────────────────────────────────────┤
│  Model Layer                            │  User (既存)
└─────────────────────────────────────────┘
```

---

## Phase別実装計画

### Phase 0: 環境準備

#### 0-1. Laravel Sanctumインストール

**実装内容:**
```bash
docker compose exec app composer require laravel/sanctum
docker compose exec app php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
docker compose exec app php artisan migrate
```

**成果物:**
- `config/sanctum.php` - Sanctum設定ファイル
- `database/migrations/*_create_personal_access_tokens_table.php` - Sanctumマイグレーション

---

#### 0-2. API routes有効化

**実装内容:**
`bootstrap/app.php` に API routes を追加

```php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',  // 追加
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // ...
```

**成果物:**
- `bootstrap/app.php` - API routes有効化

---

#### 0-3. CORS設定

**実装内容:**
`config/cors.php` を作成（Laravel標準設定ベース）

```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

**環境変数 (`.env.example`):**
```
FRONTEND_URL=http://localhost:5173
SESSION_DOMAIN=localhost
SANCTUM_STATEFUL_DOMAINS=localhost:5173
```

**成果物:**
- `config/cors.php` - CORS設定
- `.env.example` - 環境変数追加

---

#### 0-4. セッション設定確認

**確認項目:**
- `SESSION_DRIVER=database` (既存)
- `SESSION_HTTP_ONLY=true` (既存)
- `SESSION_SAME_SITE=lax` (既存)
- 本番環境: `SESSION_SECURE_COOKIE=true`

**成果物:**
- `.env.example` - セッション関連環境変数確認

---

### Phase 1: DTO層（Laravel Data）

#### 1-1. LoginData（Input DTO）

**ファイル:** `app/Data/Auth/LoginData.php`

**実装内容:**
```php
<?php

namespace App\Data\Auth;

use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final readonly class LoginData extends Data
{
    public function __construct(
        public string $email,
        public string $password,
    ) {}
}
```

**テスト:** `tests/Unit/Data/Auth/LoginDataTest.php`

**テスト内容:**
- DTOが正しく生成されること
- readonly propertyであること

---

#### 1-2. AuthenticatedUserData（Output DTO）

**ファイル:** `app/Data/Auth/AuthenticatedUserData.php`

**実装内容:**
```php
<?php

namespace App\Data\Auth;

use App\Models\User;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final readonly class AuthenticatedUserData extends Data
{
    public function __construct(
        public int $id,
        public string $name,
        public string $email,
    ) {}

    /**
     * User ModelからAuthenticatedUserDataを生成
     */
    public static function fromModel(User $user): self
    {
        return new self(
            id: $user->id,
            name: $user->name,
            email: $user->email,
        );
    }
}
```

**テスト:** `tests/Unit/Data/Auth/AuthenticatedUserDataTest.php`

**テスト内容:**
- DTOが正しく生成されること
- `fromModel()` メソッドが正しく動作すること

---

### Phase 2: UseCase層

#### 2-1. LoginUseCase

**ファイル:** `app/UseCases/Auth/LoginUseCase.php`

**実装内容:**
```php
<?php

namespace App\UseCases\Auth;

use App\Data\Auth\LoginData;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

final class LoginUseCase
{
    /**
     * ログイン処理を実行
     *
     * @throws ValidationException 認証失敗時
     */
    public function execute(LoginData $data): User
    {
        // Laravel標準のAuth::attempt()でメール・パスワード検証
        $authenticated = Auth::attempt([
            'email' => $data->email,
            'password' => $data->password,
        ]);

        if (!$authenticated) {
            throw ValidationException::withMessages([
                'email' => ['認証情報が正しくありません。'],
            ]);
        }

        // セッション再生成（セッションフィクス化攻撃対策）
        request()->session()->regenerate();

        // 認証済みユーザーを返す
        return Auth::user();
    }
}
```

**テスト:** `tests/Unit/UseCases/Auth/LoginUseCaseTest.php`

**テスト内容:**
- 正しいメール・パスワードでログイン成功
- 間違ったパスワードでValidationException
- 存在しないメールアドレスでValidationException
- セッション再生成が実行されること

---

#### 2-2. LogoutUseCase

**ファイル:** `app/UseCases/Auth/LogoutUseCase.php`

**実装内容:**
```php
<?php

namespace App\UseCases\Auth;

use Illuminate\Support\Facades\Auth;

final class LogoutUseCase
{
    /**
     * ログアウト処理を実行
     */
    public function execute(): void
    {
        // ログアウト
        Auth::logout();

        // セッション無効化
        request()->session()->invalidate();

        // CSRFトークン再生成
        request()->session()->regenerateToken();
    }
}
```

**テスト:** `tests/Unit/UseCases/Auth/LogoutUseCaseTest.php`

**テスト内容:**
- ログアウトが正しく実行されること
- セッション無効化が実行されること
- CSRFトークン再生成が実行されること

---

#### 2-3. GetAuthenticatedUserUseCase

**ファイル:** `app/UseCases/Auth/GetAuthenticatedUserUseCase.php`

**実装内容:**
```php
<?php

namespace App\UseCases\Auth;

use App\Data\Auth\AuthenticatedUserData;
use Illuminate\Support\Facades\Auth;

final class GetAuthenticatedUserUseCase
{
    /**
     * 現在認証済みのユーザー情報を取得
     *
     * @throws \Illuminate\Auth\AuthenticationException 未認証の場合
     */
    public function execute(): AuthenticatedUserData
    {
        $user = Auth::user();

        if ($user === null) {
            throw new \Illuminate\Auth\AuthenticationException('Unauthenticated.');
        }

        return AuthenticatedUserData::fromModel($user);
    }
}
```

**テスト:** `tests/Unit/UseCases/Auth/GetAuthenticatedUserUseCaseTest.php`

**テスト内容:**
- 認証済みユーザーの情報が取得できること
- 未認証の場合はAuthenticationExceptionが発生すること

---

### Phase 3: Request層

#### 3-1. LoginRequest

**ファイル:** `app/Http/Requests/Auth/LoginRequest.php`

**実装内容:**
```php
<?php

namespace App\Http\Requests\Auth;

use App\Data\Auth\LoginData;
use Illuminate\Foundation\Http\FormRequest;

final class LoginRequest extends FormRequest
{
    /**
     * リクエストが認可されるか判定
     */
    public function authorize(): bool
    {
        return true; // ログインは全ユーザーに許可
    }

    /**
     * バリデーションルール
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ];
    }

    /**
     * カスタムエラーメッセージ
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => 'メールアドレスは必須です。',
            'email.email' => 'メールアドレスの形式が正しくありません。',
            'password.required' => 'パスワードは必須です。',
            'password.min' => 'パスワードは8文字以上で入力してください。',
        ];
    }

    /**
     * LoginDataに変換
     */
    public function getLoginData(): LoginData
    {
        return LoginData::from([
            'email' => $this->input('email'),
            'password' => $this->input('password'),
        ]);
    }
}
```

**テスト:** `tests/Feature/Http/Requests/Auth/LoginRequestTest.php`

**テスト内容:**
- emailが必須であること
- emailがメールアドレス形式であること
- passwordが必須であること
- passwordが8文字以上であること
- `getLoginData()` メソッドが正しくDTOに変換すること

---

### Phase 4: Presentation層

#### 4-1. AuthController（API）

**ファイル:** `app/Http/Controllers/Api/AuthController.php`

**実装内容:**
```php
<?php

namespace App\Http\Controllers\Api;

use App\Data\Auth\AuthenticatedUserData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\UseCases\Auth\GetAuthenticatedUserUseCase;
use App\UseCases\Auth\LoginUseCase;
use App\UseCases\Auth\LogoutUseCase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private readonly LoginUseCase $loginUseCase,
        private readonly LogoutUseCase $logoutUseCase,
        private readonly GetAuthenticatedUserUseCase $getAuthenticatedUserUseCase,
    ) {}

    /**
     * ログイン
     *
     * POST /api/login
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->getLoginData();
        $user = $this->loginUseCase->execute($data);

        return response()->json([
            'data' => AuthenticatedUserData::fromModel($user),
        ], 200);
    }

    /**
     * ログアウト
     *
     * POST /api/logout
     */
    public function logout(): JsonResponse
    {
        $this->logoutUseCase->execute();

        return response()->json([
            'message' => 'Logged out successfully.',
        ], 200);
    }

    /**
     * 現在認証済みユーザー情報取得
     *
     * GET /api/user
     */
    public function user(): JsonResponse
    {
        $user = $this->getAuthenticatedUserUseCase->execute();

        return response()->json([
            'data' => $user,
        ], 200);
    }
}
```

**テスト:** `tests/Feature/Http/Controllers/Api/AuthControllerTest.php`

**テスト内容:**
- POST /api/login でログイン成功（200）
- POST /api/login でバリデーションエラー（422）
- POST /api/login で認証失敗（422）
- POST /api/logout でログアウト成功（200）
- GET /api/user で認証済みユーザー情報取得成功（200）
- GET /api/user で未認証時は401エラー

---

#### 4-2. APIルート定義

**ファイル:** `routes/api.php`

**実装内容:**
```php
<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

// 認証不要
Route::post('/login', [AuthController::class, 'login']);

// 認証必要
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
});
```

**注意**: Sanctum CSRF Cookie取得エンドポイント (`/sanctum/csrf-cookie`) は Sanctum が自動的に登録するため、手動定義は不要。

**成果物:**
- `routes/api.php` - APIルート定義

---

#### 4-3. レート制限設定

**ファイル:** `bootstrap/app.php`

**実装内容:**
```php
->withMiddleware(function (Middleware $middleware): void {
    // セキュリティヘッダをすべてのレスポンスに適用
    $middleware->append(\App\Http\Middleware\SecurityHeadersMiddleware::class);

    // API レート制限（60リクエスト/分）
    $middleware->throttleApi('60,1'); // 追加
})
```

**成果物:**
- `bootstrap/app.php` - レート制限設定追加

---

### Phase 5: テスト実装

#### 5-1. ユニットテスト

**テストファイル:**
- `tests/Unit/Data/Auth/LoginDataTest.php`
- `tests/Unit/Data/Auth/AuthenticatedUserDataTest.php`
- `tests/Unit/UseCases/Auth/LoginUseCaseTest.php`
- `tests/Unit/UseCases/Auth/LogoutUseCaseTest.php`
- `tests/Unit/UseCases/Auth/GetAuthenticatedUserUseCaseTest.php`

**カバレッジ目標:**
- UseCase層: 80%以上

---

#### 5-2. フィーチャーテスト

**テストファイル:**
- `tests/Feature/Http/Requests/Auth/LoginRequestTest.php`
- `tests/Feature/Http/Controllers/Api/AuthControllerTest.php`

**カバレッジ目標:**
- Controller層: 70%以上

---

### Phase 6: ドキュメント作成

#### 6-1. API仕様書

**ファイル:** `.claude/specs/api-spec-auth.md`

**内容:**
- エンドポイント一覧
- リクエスト/レスポンス例
- エラーレスポンス例

---

#### 6-2. セットアップガイド

**ファイル:** `.claude/specs/setup-guide-auth.md`

**内容:**
- Sanctum初期設定手順
- 環境変数設定
- マイグレーション実行手順
- CSRF Cookie取得方法

---

## Quality Checks（全Phase完了後）

```bash
# 1. PHPStan静的解析
docker compose exec app ./vendor/bin/phpstan analyse

# 2. Laravel Pint コーディング規約チェック
docker compose exec app ./vendor/bin/pint --test

# 3. PHPUnit テスト実行
docker compose exec app ./vendor/bin/phpunit --coverage-text

# 4. Deptrac 依存関係チェック
docker compose exec app ./vendor/bin/deptrac
```

**合格基準:**
- PHPStan: エラー0件
- Pint: エラー0件
- PHPUnit: 全テストパス、カバレッジ70%以上
- Deptrac: 依存関係違反0件

---

## 完了条件チェックリスト

- [ ] Phase 0: 環境準備完了
  - [ ] Laravel Sanctumインストール完了
  - [ ] API routes有効化完了
  - [ ] CORS設定完了
  - [ ] セッション設定確認完了
- [ ] Phase 1: DTO層実装完了
  - [ ] LoginData実装完了
  - [ ] AuthenticatedUserData実装完了
- [ ] Phase 2: UseCase層実装完了
  - [ ] LoginUseCase実装完了
  - [ ] LogoutUseCase実装完了
  - [ ] GetAuthenticatedUserUseCase実装完了
- [ ] Phase 3: Request層実装完了
  - [ ] LoginRequest実装完了
- [ ] Phase 4: Presentation層実装完了
  - [ ] AuthController実装完了
  - [ ] APIルート定義完了
  - [ ] レート制限設定完了
- [ ] Phase 5: テスト実装完了
  - [ ] ユニットテスト全件パス
  - [ ] フィーチャーテスト全件パス
  - [ ] カバレッジ70%以上達成
- [ ] Phase 6: ドキュメント作成完了
  - [ ] API仕様書作成完了
  - [ ] セットアップガイド作成完了
- [ ] Quality Checks完了
  - [ ] PHPStan静的解析パス
  - [ ] Laravel Pintチェックパス
  - [ ] PHPUnitテストパス
  - [ ] Deptracチェックパス
- [ ] 機能動作確認完了
  - [ ] POST /api/login でログインできる
  - [ ] POST /api/logout でログアウトできる
  - [ ] GET /api/user で認証済みユーザー情報が取得できる
  - [ ] CSRF保護が機能している
  - [ ] セッション再生成が機能している

---

## アーキテクチャ遵守事項

### レイヤー分離
- ✅ Controller は HTTP handling のみ
- ✅ UseCase はビジネスロジックのみ
- ✅ FormRequest はバリデーションとDTO変換のみ

### UseCase構造
- ✅ Input DTO (LoginData) を受け取る
- ✅ Eloquent Model (User) を返す
- ✅ `final` class

### DTO設計
- ✅ `spatie/laravel-data` を使用
- ✅ `#[TypeScript()]` attribute 付与
- ✅ `readonly` property

### 依存関係
- ✅ 依存方向は上位層から下位層への一方向のみ
- ✅ Controller → UseCase → Model

---

## セキュリティ対策

- ✅ Laravel標準のAuth::attempt()使用（ハッシュ化パスワード検証）
- ✅ セッション再生成（セッションフィクス化攻撃対策）
- ✅ CSRF保護（Sanctum標準機能）
- ✅ レート制限（60リクエスト/分）
- ✅ セッション設定: http_only=true, same_site=lax
- ✅ 本番環境: secure=true（HTTPS必須）
