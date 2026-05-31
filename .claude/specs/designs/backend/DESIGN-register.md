# DESIGN: ユーザー新規登録機能

## 概要

既存の認証機能（ログイン）と同じパターンに従い、ユーザー新規登録機能を7層アーキテクチャで実装する。

## 既存パターン分析

既存のログイン機能の構成:

```
LoginRequest (FormRequest) -> LoginData (DTO) -> LoginUseCase -> Auth Facade
```

- Repository層は現時点で未導入（Auth Facadeを直接使用）
- UseCaseはDTOを受け取り、Facadeを使用
- Controllerは UseCase のみを呼び出し、`redirect()` を返却
- User Modelの`password`キャストが`hashed`のため、代入時に自動ハッシュ化される

## アーキテクチャ設計

### データフロー

```
POST /register
  -> RegisterRequest (バリデーション + DTO変換)
    -> RegisterUserData (DTO)
      -> RegisterUserUseCase
        -> UserRepositoryInterface -> UserRepository (User::create)
        -> Auth::login() + session()->regenerate()
  <- redirect('/dashboard')
```

### 新規作成ファイル一覧

| 層 | ファイル | パス |
|----|--------|------|
| DTO | RegisterUserData | `app/Data/Auth/RegisterUserData.php` |
| Repository Interface | UserRepositoryInterface | `app/Repositories/UserRepositoryInterface.php` |
| Repository | UserRepository | `app/Repositories/UserRepository.php` |
| UseCase | RegisterUserUseCase | `app/UseCases/Auth/RegisterUserUseCase.php` |
| FormRequest | RegisterRequest | `app/Http/Requests/Auth/RegisterRequest.php` |
| Controller | AuthPageController (既存拡張) | `app/Http/Controllers/Web/AuthPageController.php` |
| Route | web.php (既存拡張) | `routes/web.php` |
| DI | AppServiceProvider (既存拡張) | `app/Providers/AppServiceProvider.php` |

### テストファイル一覧

| 種別 | ファイル | パス |
|------|--------|------|
| Unit | RegisterUserDataTest | `tests/Unit/Data/Auth/RegisterUserDataTest.php` |
| Feature | RegisterRequestTest | `tests/Feature/Http/Requests/Auth/RegisterRequestTest.php` |
| Feature | RegisterUserUseCaseTest | `tests/Feature/UseCases/Auth/RegisterUserUseCaseTest.php` |
| Feature | AuthPageControllerTest (既存拡張) | `tests/Feature/Http/Controllers/Web/AuthPageControllerTest.php` |

---

## Phase別 実装計画

### Phase 0: 環境準備

- [x] 既存User Model確認 -- `fillable: ['name', 'email', 'password']`, `password`キャストは`hashed`
- [x] 既存認証パターン確認 -- FormRequest -> DTO -> UseCase -> Auth Facade
- [x] 既存テストパターン確認 -- RefreshDatabase, setUp, AAA パターン

### Phase 1: DTO層 - RegisterUserData

**作成ファイル:**
- `app/Data/Auth/RegisterUserData.php`
- `tests/Unit/Data/Auth/RegisterUserDataTest.php`

**RegisterUserData 設計:**

```php
<?php
declare(strict_types=1);
namespace App\Data\Auth;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class RegisterUserData extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $password,
    ) {}
}
```

- `password_confirmation` はバリデーション専用のためDTOには含めない
- 既存 `LoginData` と同じパターン（`#[TypeScript()]`, `#[MapName(SnakeCaseMapper::class)]`）

**テスト (RED -> GREEN -> REFACTOR):**
1. RED: DTOインスタンス生成テスト
2. GREEN: DTO実装
3. REFACTOR: 不要

### Phase 2: Repository層 - UserRepositoryInterface / UserRepository

**作成ファイル:**
- `app/Repositories/UserRepositoryInterface.php`
- `app/Repositories/UserRepository.php`

**UserRepositoryInterface 設計:**

```php
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
```

**UserRepository 設計:**

```php
<?php
declare(strict_types=1);
namespace App\Repositories;

use App\Data\Auth\RegisterUserData;
use App\Models\User;

final class UserRepository implements UserRepositoryInterface
{
    /**
     * 新規ユーザーを作成
     *
     * パスワードはUser Modelの`hashed`キャストにより自動ハッシュ化される
     */
    public function create(RegisterUserData $data): User
    {
        return User::create([
            'name' => $data->name,
            'email' => $data->email,
            'password' => $data->password,
        ]);
    }
}
```

- User Modelの`password`キャストが`hashed`のため、`Hash::make()`は不要（二重ハッシュ防止）
- Interface経由でアクセスし、依存性逆転を実現

**テスト:** UseCase テストで統合的に検証（Repository単体テストは Phase 3 で間接的にカバー）

### Phase 3: UseCase層 - RegisterUserUseCase

**作成ファイル:**
- `app/UseCases/Auth/RegisterUserUseCase.php`
- `tests/Feature/UseCases/Auth/RegisterUserUseCaseTest.php`

**RegisterUserUseCase 設計:**

```php
<?php
declare(strict_types=1);
namespace App\UseCases\Auth;

use App\Data\Auth\AuthenticatedUserData;
use App\Data\Auth\RegisterUserData;
use App\Repositories\UserRepositoryInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

final class RegisterUserUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
    ) {}

    /**
     * ユーザー新規登録処理を実行
     */
    public function execute(RegisterUserData $data, ?Request $request = null): AuthenticatedUserData
    {
        // ユーザー作成
        $user = $this->userRepository->create($data);

        // 自動ログイン
        Auth::login($user);

        // セッション再生成（セッションフィクス化攻撃対策）
        $req = $request ?? request();
        if ($req->hasSession()) {
            $req->session()->regenerate();
        }

        return AuthenticatedUserData::from($user);
    }
}
```

- 既存 `LoginUseCase` と同じパターン（Request受取、セッション再生成、AuthenticatedUserData返却）
- Repository Interface経由でユーザー作成
- 戻り値は既存の `AuthenticatedUserData` を再利用

**テスト (RED -> GREEN -> REFACTOR):**
1. RED: 正常登録でユーザー作成 + 自動ログイン
2. RED: セッション再生成の確認
3. RED: AuthenticatedUserData が正しく返却される
4. GREEN: UseCase 実装
5. REFACTOR: 不要

### Phase 4: Request・Controller層

**作成ファイル:**
- `app/Http/Requests/Auth/RegisterRequest.php`
- `tests/Feature/Http/Requests/Auth/RegisterRequestTest.php`

**RegisterRequest 設計:**

```php
<?php
declare(strict_types=1);
namespace App\Http\Requests\Auth;

use App\Data\Auth\RegisterUserData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

final class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => '名前は必須です。',
            'name.max' => '名前は255文字以内で入力してください。',
            'email.required' => 'メールアドレスは必須です。',
            'email.email' => 'メールアドレスの形式が正しくありません。',
            'email.unique' => 'このメールアドレスは既に登録されています。',
            'password.required' => 'パスワードは必須です。',
            'password.confirmed' => 'パスワードが一致しません。',
        ];
    }

    public function toRegisterUserData(): RegisterUserData
    {
        return RegisterUserData::from($this->validated());
    }
}
```

- パスワードポリシー: `Password::min(8)->mixedCase()->numbers()->symbols()`
- `confirmed` ルールで `password_confirmation` との一致を検証
- `unique:users,email` でメールアドレス一意性チェック

**AuthPageController 拡張:**

```php
// コンストラクタに RegisterUserUseCase を追加
public function __construct(
    private readonly LoginUseCase $loginUseCase,
    private readonly LogoutUseCase $logoutUseCase,
    private readonly RegisterUserUseCase $registerUserUseCase,
) {}

// 登録ページ表示
public function showRegister(): Response
{
    return Inertia::render('Auth/Register');
}

// 登録処理
public function register(RegisterRequest $request): RedirectResponse
{
    $data = $request->toRegisterUserData();
    $this->registerUserUseCase->execute($data, $request);

    return redirect()->intended('/dashboard');
}
```

**ルート追加 (web.php):**

```php
// guest ミドルウェアグループ内に追加
Route::get('/register', [AuthPageController::class, 'showRegister'])->name('register');
Route::post('/register', [AuthPageController::class, 'register'])
    ->middleware('throttle:5,1');
```

- `throttle:5,1` -- 1分間に5回まで（既存ログインと同一設定）

**テスト (RED -> GREEN -> REFACTOR):**
1. RED: GET /register が 200 を返す
2. RED: 認証済みユーザーは /dashboard にリダイレクト
3. RED: 正常登録で /dashboard にリダイレクト + 認証済み
4. RED: 名前未入力でバリデーションエラー
5. RED: メール重複でバリデーションエラー
6. RED: パスワード不一致でバリデーションエラー
7. RED: パスワードポリシー違反でバリデーションエラー
8. GREEN: Controller + Route 実装
9. REFACTOR: 不要

### Phase 5: DI設定・セキュリティ

**AppServiceProvider 拡張:**

```php
public function register(): void
{
    $this->app->bind(
        \App\Repositories\UserRepositoryInterface::class,
        \App\Repositories\UserRepository::class,
    );
}
```

**セキュリティチェック:**
- [x] パスワードは `hashed` キャストで自動ハッシュ化
- [x] セッション再生成（セッションフィクス化攻撃対策）
- [x] CSRF -- Inertia + `@csrf` による自動保護
- [x] レート制限 -- `throttle:5,1`
- [x] パスワードポリシー -- `Password::min(8)->mixedCase()->numbers()->symbols()`
- [x] メールアドレス一意性 -- `unique:users,email`
- [x] 入力バリデーション -- FormRequest
- [x] SQLインジェクション -- Eloquent ORM使用

---

## 依存関係図

```
AuthPageController
  -> RegisterRequest -> RegisterUserData (DTO)
  -> RegisterUserUseCase
       -> UserRepositoryInterface (Interface)
            -> UserRepository -> User (Model)
       -> Auth Facade
       -> AuthenticatedUserData (DTO)
```

## 完了条件

- [ ] PHPUnit テスト全パス（Unit + Feature）
- [ ] PHPStan 静的解析パス
- [ ] Laravel Pint コーディング規約パス
- [ ] Deptrac 依存関係チェックパス
- [ ] セキュリティチェックリスト準拠
