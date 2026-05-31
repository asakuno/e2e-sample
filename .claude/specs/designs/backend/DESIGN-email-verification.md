# 実装計画: メール認証フロー追加

## 概要

既存のユーザー新規登録機能に Laravel 標準のメール認証フロー（MustVerifyEmail + 署名付きURL）を追加する。

## アーキテクチャ影響分析

### 影響する層

| 層 | 変更種別 | 対象 |
|----|---------|------|
| Model | 修正 | `User` に `MustVerifyEmail` 実装 |
| UseCase | 修正 | `RegisterUserUseCase` にメール送信追加 |
| UseCase | 新規 | `SendEmailVerificationUseCase` |
| UseCase | 新規 | `VerifyEmailUseCase` |
| Request | 新規 | `EmailVerificationRequest`（署名検証） |
| Presentation | 新規 | `EmailVerificationPageController` |
| Route | 修正 | `routes/web.php` にメール認証ルート追加 |

### 変更しないもの

- Repository層: データアクセスの変更なし（`markEmailAsVerified()` は Eloquent Model のメソッド）
- Resource層: レスポンス形式の変更なし
- Service層: 共通ロジックの追加なし
- DTO: 新規DTO不要（Laravel 標準の `MustVerifyEmail` が処理）

## 設計判断

### 1. UseCase の責務分割

- `RegisterUserUseCase`: 登録 + メール認証通知送信（既存修正）
- `SendEmailVerificationUseCase`: 認証メール再送（新規）
- `VerifyEmailUseCase`: 署名検証 + メール認証完了（新規）

**理由**: 単一責任原則。認証メール再送と認証完了は独立した操作。

### 2. Repository層の変更が不要な理由

`markEmailAsVerified()` は `MustVerifyEmail` trait が提供する Eloquent Model メソッドであり、UseCase から直接 User Model のメソッドを呼び出す。Repository に新メソッドを追加する必要はない。UseCase は Repository 経由で User を取得するのではなく、Controller から認証済み User を受け取る。

### 3. Controller 命名

`EmailVerificationPageController`（Web Controller 命名規則: `[Resource]PageController`）

### 4. FormRequest で署名検証

Laravel の `EmailVerificationRequest` を参考に、カスタム FormRequest で署名検証 + 認可チェックを行う。

---

## Phase 1: Model層 - MustVerifyEmail 実装

### RED: テスト作成

**ファイル**: `tests/Feature/Models/UserEmailVerificationTest.php`

```php
// User が MustVerifyEmail を実装していることを確認
// hasVerifiedEmail(), markEmailAsVerified(), sendEmailVerificationNotification() が使用可能
```

**テスト項目**:
1. User が `MustVerifyEmail` インターフェースを実装している
2. `email_verified_at` が null の場合 `hasVerifiedEmail()` が false を返す
3. `markEmailAsVerified()` で `email_verified_at` が設定される

### GREEN: 実装

**ファイル**: `app/Models/User.php`

変更内容:
- `use Illuminate\Contracts\Auth\MustVerifyEmail;` のコメント解除
- `class User extends Authenticatable` を `class User extends Authenticatable implements MustVerifyEmail` に変更

### REFACTOR

- 変更なし（最小限の変更のため）

---

## Phase 2: UseCase層 - ビジネスロジック実装

### Phase 2-1: RegisterUserUseCase 修正（メール認証通知送信）

#### RED: テスト作成

**ファイル**: `tests/Feature/UseCases/Auth/RegisterUserUseCaseTest.php`（既存修正）

**追加テスト項目**:
1. 登録後にメール認証通知が送信される（`Notification::assertSentTo`）

#### GREEN: 実装

**ファイル**: `app/UseCases/Auth/RegisterUserUseCase.php`

変更内容:
- `execute()` 内で `$user->sendEmailVerificationNotification()` を追加
- Auth::login() の後に呼び出す

```php
public function execute(RegisterUserData $data): AuthenticatedUserData
{
    $user = $this->userRepository->create($data);
    Auth::login($user);

    // メール認証通知を送信
    $user->sendEmailVerificationNotification();

    return AuthenticatedUserData::from($user);
}
```

### Phase 2-2: SendEmailVerificationUseCase 新規作成

#### RED: テスト作成

**ファイル**: `tests/Feature/UseCases/Auth/SendEmailVerificationUseCaseTest.php`

**テスト項目**:
1. 未認証ユーザーにメール認証通知が送信される
2. 認証済みユーザーには送信されない（早期リターン）

#### GREEN: 実装

**ファイル**: `app/UseCases/Auth/SendEmailVerificationUseCase.php`

```php
final class SendEmailVerificationUseCase
{
    /**
     * メール認証通知を再送
     */
    public function execute(User $user): void
    {
        if ($user->hasVerifiedEmail()) {
            return;
        }

        $user->sendEmailVerificationNotification();
    }
}
```

**注意**: このUseCaseはUserモデルを直接受け取る。認証済みユーザーはControllerからDI（`$request->user()`）で渡される。DTOは不要（入力がUserモデルのみのため）。

### Phase 2-3: VerifyEmailUseCase 新規作成

#### RED: テスト作成

**ファイル**: `tests/Feature/UseCases/Auth/VerifyEmailUseCaseTest.php`

**テスト項目**:
1. 未認証ユーザーのメール認証が完了する（`email_verified_at` が設定される）
2. `Verified` イベントが発行される
3. 既に認証済みのユーザーには何もしない（早期リターン）

#### GREEN: 実装

**ファイル**: `app/UseCases/Auth/VerifyEmailUseCase.php`

```php
use Illuminate\Auth\Events\Verified;

final class VerifyEmailUseCase
{
    /**
     * メール認証を完了する
     *
     * @return bool 認証が新たに完了した場合true
     */
    public function execute(User $user): bool
    {
        if ($user->hasVerifiedEmail()) {
            return false;
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        return true;
    }
}
```

---

## Phase 3: Controller・Request・Route層

### Phase 3-1: EmailVerificationRequest 新規作成

#### RED: テスト作成

**ファイル**: `tests/Feature/Http/Requests/Auth/EmailVerificationRequestTest.php`

**テスト項目**:
1. 署名が有効な場合に認可される
2. リクエストのidパラメータが認証ユーザーのIDと一致する場合に認可される
3. idが一致しない場合は認可されない

#### GREEN: 実装

**ファイル**: `app/Http/Requests/Auth/EmailVerificationRequest.php`

```php
class EmailVerificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        // 署名検証 + ユーザーID一致チェック
        if (! hash_equals(
            (string) $this->user()->getKey(),
            (string) $this->route('id')
        )) {
            return false;
        }

        return $this->hasValidSignature();
    }

    public function rules(): array
    {
        return [];
    }
}
```

### Phase 3-2: EmailVerificationPageController 新規作成

#### RED: テスト作成

**ファイル**: `tests/Feature/Http/Controllers/Web/EmailVerificationPageControllerTest.php`

**テスト項目**:
1. `notice`: 認証済みユーザーはダッシュボードにリダイレクト
2. `notice`: 未認証ユーザーにはメール認証待ちページが表示される
3. `verify`: 有効な署名URLでメール認証が完了し、ダッシュボードにリダイレクト
4. `verify`: 無効な署名URLで403エラー
5. `send`: 認証メール再送後にリダイレクト（ステータスメッセージ付き）
6. `send`: スロットリング（1分に1回制限）

#### GREEN: 実装

**ファイル**: `app/Http/Controllers/Web/EmailVerificationPageController.php`

```php
class EmailVerificationPageController extends Controller
{
    public function __construct(
        private readonly SendEmailVerificationUseCase $sendEmailVerificationUseCase,
        private readonly VerifyEmailUseCase $verifyEmailUseCase,
    ) {}

    /**
     * メール認証待ちページ表示
     */
    public function notice(Request $request): Response|RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended('/dashboard');
        }

        return Inertia::render('Auth/VerifyEmail', [
            'status' => session('status'),
        ]);
    }

    /**
     * メール認証処理
     */
    public function verify(EmailVerificationRequest $request): RedirectResponse
    {
        $this->verifyEmailUseCase->execute($request->user());

        return redirect()->intended('/dashboard' . '?verified=1');
    }

    /**
     * 認証メール再送
     */
    public function send(Request $request): RedirectResponse
    {
        $this->sendEmailVerificationUseCase->execute($request->user());

        return back()->with('status', 'verification-link-sent');
    }
}
```

### Phase 3-3: ルート追加

**ファイル**: `routes/web.php`

変更内容:

```php
// 認証済み（メール未認証可）ユーザー用
Route::middleware(['auth'])->group(function () {
    Route::get('/email/verify', [EmailVerificationPageController::class, 'notice'])
        ->name('verification.notice');

    Route::get('/email/verify/{id}/{hash}', [EmailVerificationPageController::class, 'verify'])
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('/email/verification-notification', [EmailVerificationPageController::class, 'send'])
        ->middleware('throttle:6,1')
        ->name('verification.send');
});

// 認証済み + メール認証済みユーザー用
Route::middleware(['auth', 'verified', 'precognitive'])->group(function () {
    Route::get('/dashboard', DashboardPageController::class)->name('dashboard');
});

// logout は verified 不要（auth のみ）
Route::middleware(['auth'])->group(function () {
    Route::post('/logout', [AuthPageController::class, 'logout'])->name('logout');
});
```

**重要な変更点**:
- ダッシュボードルートに `verified` ミドルウェアを追加
- `logout` は `verified` 不要（未認証ユーザーもログアウトできる必要がある）
- メール認証ルートは `auth` のみ（`verified` は不要）

### Phase 3-4: 登録後のリダイレクト先変更

**ファイル**: `app/Http/Controllers/Web/AuthPageController.php`

変更内容:
- `register()` メソッドのリダイレクト先を `/dashboard` から `/email/verify`（`route('verification.notice')`）に変更
- `verified` ミドルウェアにより、ダッシュボードへ直接遷移できなくなるため

```php
public function register(RegisterRequest $request): RedirectResponse
{
    $data = $request->toRegisterUserData();
    $this->registerUserUseCase->execute($data);
    $request->session()->regenerate();

    return redirect()->route('verification.notice');
}
```

---

## 実装順序まとめ

| 順序 | Phase | ファイル | 種別 |
|------|-------|---------|------|
| 1 | Phase 1 | `app/Models/User.php` | 修正 |
| 2 | Phase 2-1 | `app/UseCases/Auth/RegisterUserUseCase.php` | 修正 |
| 3 | Phase 2-2 | `app/UseCases/Auth/SendEmailVerificationUseCase.php` | 新規 |
| 4 | Phase 2-3 | `app/UseCases/Auth/VerifyEmailUseCase.php` | 新規 |
| 5 | Phase 3-1 | `app/Http/Requests/Auth/EmailVerificationRequest.php` | 新規 |
| 6 | Phase 3-2 | `app/Http/Controllers/Web/EmailVerificationPageController.php` | 新規 |
| 7 | Phase 3-3 | `routes/web.php` | 修正 |
| 8 | Phase 3-4 | `app/Http/Controllers/Web/AuthPageController.php` | 修正 |

## テストファイル一覧

| ファイル | 種別 |
|---------|------|
| `tests/Feature/Models/UserEmailVerificationTest.php` | 新規 |
| `tests/Feature/UseCases/Auth/RegisterUserUseCaseTest.php` | 修正 |
| `tests/Feature/UseCases/Auth/SendEmailVerificationUseCaseTest.php` | 新規 |
| `tests/Feature/UseCases/Auth/VerifyEmailUseCaseTest.php` | 新規 |
| `tests/Feature/Http/Requests/Auth/EmailVerificationRequestTest.php` | 新規 |
| `tests/Feature/Http/Controllers/Web/EmailVerificationPageControllerTest.php` | 新規 |

## フロントエンド（別タスク）

以下は本計画のスコープ外。別途フロントエンドタスクとして実施する。

- `resources/js/pages/Auth/VerifyEmail.tsx` - メール認証待ちページ
