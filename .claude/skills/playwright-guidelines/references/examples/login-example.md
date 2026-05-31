# ログイン画面 完全実装例

実際のプロジェクトで使用できる具体的な実装例。テンプレートの各セクションがどのように記述されるかを示す。

## 参照仕様書情報

```markdown
# ログイン画面 E2E実装計画書

## 参照仕様書
- パス: tests/e2e/specs/auth/login.spec.md
- 画面ID: SCR-AUTH-001
- テストケース数: 正常系2件, 異常系4件, 境界値3件（計9件）

## Playwright環境
- 設定ファイル: playwright.config.ts
- ベースURL: http://localhost:8000
- Laravel連携: testing用Artisanコマンド（reset/factory/scenario）+ TSラッパー（laravel fixture）
```

## Page Object設計

### AuthLoginPage

- 継承: BasePage
- ファイル: tests/e2e/pages/auth/AuthLoginPage.ts

### ロケーター一覧

| 名前 | セレクタ種別 | セレクタ値 | 代替セレクタ | DOM確認結果 |
|------|-------------|-----------|-------------|------------|
| emailInput | `getByLabel` | `'メールアドレス'` | `getByRole('textbox', { name: 'メールアドレス' })` | ✓ `<input type="email" aria-label="メールアドレス">` |
| passwordInput | `getByLabel` | `'パスワード'` | `getByRole('textbox', { name: 'パスワード' })` | ✓ `<input type="password" aria-label="パスワード">` |
| loginButton | `getByRole` | `'button', { name: 'ログイン' }` | `getByText('ログイン')` | ✓ `<button type="submit">ログイン</button>` |
| errorMessage | `getByRole` | `'alert'` | `getByTestId('login-error')` | ✓ `<div role="alert" class="text-red-500">` |
| forgotPasswordLink | `getByRole` | `'link', { name: 'パスワードをお忘れですか？' }` | - | ✓ `<a href="/forgot-password">` |

### アクションメソッド一覧

| メソッド名 | 引数 | 処理内容 |
|-----------|------|---------|
| `fillEmail(email: string)` | email: メールアドレス | メールアドレス入力欄に値を入力 |
| `fillPassword(password: string)` | password: パスワード | パスワード入力欄に値を入力 |
| `clickLogin()` | なし | ログインボタンをクリック |
| `login(email: string, password: string)` | email, password | 一連のログイン操作を実行 |

### アサーションメソッド一覧

| メソッド名 | 検証内容 |
|-----------|---------|
| `expectErrorMessage(message: string)` | エラーメッセージが表示されていることを検証 |
| `expectNoErrorMessage()` | エラーメッセージが表示されていないことを検証 |
| `expectRedirectToDashboard()` | ダッシュボードへリダイレクトされたことを検証 |

## テストケース詳細

### 正常系テストケース

#### AUTH_LOGIN_001: 有効な認証情報でログイン成功

- **Arrange**:
  - ユーザーを作成: `UserFactory::create(['email' => 'test@example.com', 'password' => Hash::make('password123')])`
  - ログイン画面にアクセス: `/login`
- **Act**:
  - メールアドレス欄に `test@example.com` を入力
  - パスワード欄に `password123` を入力
  - ログインボタンをクリック
- **Assert**:
  - ダッシュボード画面 (`/dashboard`) にリダイレクトされる
  - URL が `/dashboard` になっている
  - ナビゲーションにユーザー名が表示されている

#### AUTH_LOGIN_002: ログイン後にセッションが維持される

- **Arrange**:
  - `AUTH_LOGIN_001` と同様にログイン済み状態
- **Act**:
  - 別のページ (`/profile`) にアクセス
- **Assert**:
  - ログイン状態が維持されている
  - ログイン画面にリダイレクトされない

### 異常系テストケース

#### AUTH_LOGIN_ERR_001: 存在しないメールアドレスでログイン失敗

- **Arrange**:
  - ログイン画面にアクセス
- **Act**:
  - メールアドレス欄に `nonexistent@example.com` を入力
  - パスワード欄に `password123` を入力
  - ログインボタンをクリック
- **Assert**:
  - エラーメッセージ「認証に失敗しました。」が表示される
  - URL が `/login` のまま

#### AUTH_LOGIN_ERR_002: 間違ったパスワードでログイン失敗

- **Arrange**:
  - ユーザーを作成: `UserFactory::create(['email' => 'test@example.com'])`
  - ログイン画面にアクセス
- **Act**:
  - メールアドレス欄に `test@example.com` を入力
  - パスワード欄に `wrongpassword` を入力
  - ログインボタンをクリック
- **Assert**:
  - エラーメッセージ「認証に失敗しました。」が表示される

#### AUTH_LOGIN_ERR_003: メールアドレス未入力でバリデーションエラー

- **Arrange**:
  - ログイン画面にアクセス
- **Act**:
  - メールアドレス欄を空のまま
  - パスワード欄に `password123` を入力
  - ログインボタンをクリック
- **Assert**:
  - エラーメッセージ「メールアドレスは必須です。」が表示される

#### AUTH_LOGIN_ERR_004: パスワード未入力でバリデーションエラー

- **Arrange**:
  - ログイン画面にアクセス
- **Act**:
  - メールアドレス欄に `test@example.com` を入力
  - パスワード欄を空のまま
  - ログインボタンをクリック
- **Assert**:
  - エラーメッセージ「パスワードは必須です。」が表示される

### 境界値テストケース

#### AUTH_LOGIN_BND_001: メールアドレス最大長での入力

- **Arrange**:
  - 254文字のメールアドレスを持つユーザーを作成
  - ログイン画面にアクセス
- **Act**:
  - 254文字のメールアドレスを入力
  - 正しいパスワードを入力
  - ログインボタンをクリック
- **Assert**:
  - 正常にログインできる

#### AUTH_LOGIN_BND_002: パスワード最小長（8文字）での入力

- **Arrange**:
  - パスワード `12345678`（8文字）のユーザーを作成
  - ログイン画面にアクセス
- **Act**:
  - メールアドレスを入力
  - パスワード `12345678` を入力
  - ログインボタンをクリック
- **Assert**:
  - 正常にログインできる

#### AUTH_LOGIN_BND_003: 不正な形式のメールアドレス

- **Arrange**:
  - ログイン画面にアクセス
- **Act**:
  - メールアドレス欄に `invalid-email` を入力
  - パスワード欄に `password123` を入力
  - ログインボタンをクリック
- **Assert**:
  - エラーメッセージ「有効なメールアドレスを入力してください。」が表示される

## フィクスチャ設計

### テストデータ設計

| モデル | ファクトリー | ステート | カスタム属性 | 用途 |
|--------|-------------|---------|-------------|------|
| User | UserFactory | - | `{ email: 'test@example.com', password: Hash::make('password123') }` | 正常ログイン用ユーザー |
| User | UserFactory | - | `{ email: 'max254chars...@example.com' }` | 最大長メールアドレステスト用 |
| User | UserFactory | - | `{ password: Hash::make('12345678') }` | 最小長パスワードテスト用 |

### テストデータ（固定値）

| データ種別 | 値 | 用途 |
|-----------|-----|------|
| 無効メールアドレス | `nonexistent@example.com` | 存在しないユーザーテスト |
| 無効パスワード | `wrongpassword` | 認証失敗テスト |
| 不正形式メール | `invalid-email` | バリデーションエラーテスト |

## 完全なコード例

### Page Object: AuthLoginPage.ts

```typescript
// tests/e2e/pages/auth/AuthLoginPage.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class AuthLoginPage extends BasePage {
  // ロケーター定義
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('メールアドレス');
    this.passwordInput = page.getByLabel('パスワード');
    this.loginButton = page.getByRole('button', { name: 'ログイン' });
    this.errorMessage = page.getByRole('alert');
    this.forgotPasswordLink = page.getByRole('link', { name: 'パスワードをお忘れですか？' });
  }

  // ページ遷移
  async goto() {
    await this.page.goto('/login');
  }

  // アクションメソッド
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async clickLogin() {
    await this.loginButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  // アサーションメソッド
  async expectErrorMessage(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async expectNoErrorMessage() {
    await expect(this.errorMessage).not.toBeVisible();
  }

  async expectRedirectToDashboard() {
    await expect(this.page).toHaveURL('/dashboard');
  }
}
```

### フィクスチャ: testSetup.ts

```typescript
// tests/e2e/fixtures/testSetup.ts
import { test as baseTest, expect } from '@playwright/test';
import { AuthLoginPage } from '../pages/auth/AuthLoginPage';

type Pages = {
  authLoginPage: AuthLoginPage;
};

export const test = baseTest.extend<Pages>({
  authLoginPage: async ({ page }, use) => {
    const authLoginPage = new AuthLoginPage(page);
    await authLoginPage.goto();
    await use(authLoginPage);
  },
});

export { expect };
```

### テストコード: login.spec.ts

```typescript
// tests/e2e/tests/auth/login.spec.ts
import { test, expect } from '../../fixtures/testSetup';

test.describe('ログイン画面', () => {
  test.describe('正常系', () => {
    test('AUTH_LOGIN_001: 有効な認証情報でログイン成功', async ({ authLoginPage, page }) => {
      // Arrange
      // Laravel ファクトリーでユーザー作成（laravel fixture 経由 / 許可リストの論理名 'user'）
      // const { model: user } = await laravel.factory<{ model: { email: string } }>('user', {
      //   email: 'test@example.com',
      // });

      // Act
      await authLoginPage.login('test@example.com', 'password123');

      // Assert
      await authLoginPage.expectRedirectToDashboard();
      await expect(page).toHaveURL('/dashboard');
    });

    test('AUTH_LOGIN_002: ログイン後にセッションが維持される', async ({ authLoginPage, page }) => {
      // Arrange
      await authLoginPage.login('test@example.com', 'password123');
      await authLoginPage.expectRedirectToDashboard();

      // Act
      await page.goto('/profile');

      // Assert
      await expect(page).not.toHaveURL('/login');
      await expect(page).toHaveURL('/profile');
    });
  });

  test.describe('異常系', () => {
    test('AUTH_LOGIN_ERR_001: 存在しないメールアドレスでログイン失敗', async ({ authLoginPage }) => {
      // Arrange - ログイン画面は fixture で既にアクセス済み

      // Act
      await authLoginPage.login('nonexistent@example.com', 'password123');

      // Assert
      await authLoginPage.expectErrorMessage('認証に失敗しました。');
    });

    test('AUTH_LOGIN_ERR_002: 間違ったパスワードでログイン失敗', async ({ authLoginPage }) => {
      // Arrange - ユーザーは事前にseeder等で作成済みと想定

      // Act
      await authLoginPage.login('test@example.com', 'wrongpassword');

      // Assert
      await authLoginPage.expectErrorMessage('認証に失敗しました。');
    });

    test('AUTH_LOGIN_ERR_003: メールアドレス未入力でバリデーションエラー', async ({ authLoginPage }) => {
      // Arrange - メールは入力しない

      // Act
      await authLoginPage.fillPassword('password123');
      await authLoginPage.clickLogin();

      // Assert
      await authLoginPage.expectErrorMessage('メールアドレスは必須です。');
    });

    test('AUTH_LOGIN_ERR_004: パスワード未入力でバリデーションエラー', async ({ authLoginPage }) => {
      // Arrange - パスワードは入力しない

      // Act
      await authLoginPage.fillEmail('test@example.com');
      await authLoginPage.clickLogin();

      // Assert
      await authLoginPage.expectErrorMessage('パスワードは必須です。');
    });
  });

  test.describe('境界値', () => {
    test('AUTH_LOGIN_BND_001: メールアドレス最大長での入力', async ({ authLoginPage }) => {
      // Arrange
      const maxLengthEmail = 'a'.repeat(245) + '@test.com'; // 254文字

      // Act
      await authLoginPage.login(maxLengthEmail, 'password123');

      // Assert
      await authLoginPage.expectRedirectToDashboard();
    });

    test('AUTH_LOGIN_BND_002: パスワード最小長（8文字）での入力', async ({ authLoginPage }) => {
      // Arrange - 8文字パスワードのユーザーを事前に作成

      // Act
      await authLoginPage.login('minpassword@example.com', '12345678');

      // Assert
      await authLoginPage.expectRedirectToDashboard();
    });

    test('AUTH_LOGIN_BND_003: 不正な形式のメールアドレス', async ({ authLoginPage }) => {
      // Arrange - 不正形式のメールアドレス

      // Act
      await authLoginPage.login('invalid-email', 'password123');

      // Assert
      await authLoginPage.expectErrorMessage('有効なメールアドレスを入力してください。');
    });
  });
});
```

## トレーサビリティマトリクス

| 画面要素ID | 要素名 | 機能種別 | テストケース | カバレッジ状況 |
|-----------|--------|---------|-------------|--------------|
| ELM-001 | メールアドレス入力欄 | 入力 | AUTH_LOGIN_001, AUTH_LOGIN_ERR_001, AUTH_LOGIN_ERR_003, AUTH_LOGIN_BND_001, AUTH_LOGIN_BND_003 | 正常系✓ 異常系✓ 境界値✓ |
| ELM-002 | パスワード入力欄 | 入力 | AUTH_LOGIN_001, AUTH_LOGIN_ERR_002, AUTH_LOGIN_ERR_004, AUTH_LOGIN_BND_002 | 正常系✓ 異常系✓ 境界値✓ |
| ELM-003 | ログインボタン | ナビゲーション | AUTH_LOGIN_001 | 正常系✓ 異常系- 境界値- |
| ELM-004 | エラーメッセージ表示エリア | 表示 | AUTH_LOGIN_ERR_001, AUTH_LOGIN_ERR_002, AUTH_LOGIN_ERR_003, AUTH_LOGIN_ERR_004 | 正常系✓ 異常系✓ 境界値- |
| ELM-005 | パスワードリセットリンク | ナビゲーション | - | 正常系✗ 異常系- 境界値- |

※ ELM-005（パスワードリセットリンク）は別仕様書 `forgot-password.spec.md` でカバー
