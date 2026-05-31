# Laravel統合（hyvor/laravel-playwright）

`hyvor/laravel-playwright`パッケージを使用することで、PlaywrightからLaravelバックエンドを直接操作できる。

## 目次

- [セットアップ](#セットアップ)
- [基本的な使用方法](#基本的な使用方法)
- [Artisanコマンド](#artisanコマンド)
- [ファクトリー操作](#ファクトリー操作)
- [データベース操作](#データベース操作)
- [認証セットアップ](#認証セットアップ)
- [テストパターン](#テストパターン)
- [CSRF対策](#csrf対策)
- [トラブルシューティング](#トラブルシューティング)

## セットアップ

### インストール

```bash
# Laravelプロジェクト
composer require --dev hyvor/laravel-playwright

# Playwright側
npm install @hyvor/laravel-playwright
```

### Laravel設定

```php
// config/playwright.php（自動公開）
return [
    'enabled' => env('PLAYWRIGHT_ENABLED', false),
];
```

```env
# .env.testing
PLAYWRIGHT_ENABLED=true
APP_ENV=testing
```

### Playwright設定

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8000',
  },
  webServer: {
    command: 'php artisan serve --port=8000 --env=testing',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 基本的な使用方法

### testのインポート

```typescript
// hyvor/laravel-playwrightからtestをインポート
import { test } from '@hyvor/laravel-playwright';
import { expect } from '@playwright/test';

test('基本的なテスト', async ({ laravel, page }) => {
  // laravelオブジェクトでLaravelを操作
  await laravel.artisan('migrate:fresh');

  await page.goto('/');
  await expect(page).toHaveTitle(/Laravel/);
});
```

### カスタムフィクスチャとの統合

```typescript
// fixtures/testSetup.ts
import { test as laravelTest } from '@hyvor/laravel-playwright';
import { LoginPage } from '../pages/LoginPage';

type TestFixtures = {
  loginPage: LoginPage;
};

export const test = laravelTest.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
```

## Artisanコマンド

### 基本的な実行

```typescript
test('Artisanコマンド実行', async ({ laravel }) => {
  // マイグレーション
  await laravel.artisan('migrate:fresh');

  // シーダー実行
  await laravel.artisan('db:seed');

  // 特定のシーダー
  await laravel.artisan('db:seed', ['--class', 'UserSeeder']);

  // キャッシュクリア
  await laravel.artisan('cache:clear');
  await laravel.artisan('config:clear');
  await laravel.artisan('route:clear');
});
```

### カスタムコマンド

```typescript
test('カスタムArtisanコマンド', async ({ laravel }) => {
  // カスタムコマンドの実行
  await laravel.artisan('app:setup-test-data', ['--count', '10']);
});
```

## ファクトリー操作

### モデル作成

```typescript
test('ファクトリーでユーザー作成', async ({ laravel, page }) => {
  // 単一モデル作成
  const user = await laravel.factory('User', {
    name: '山田太郎',
    email: 'yamada@example.com',
    password: 'password123'
  });

  console.log(user.id);    // 作成されたユーザーID
  console.log(user.email); // yamada@example.com

  // 複数モデル作成
  const users = await laravel.factory('User', {}, 5);
  console.log(users.length); // 5

  // 関連モデルと一緒に作成
  const post = await laravel.factory('Post', {
    user_id: user.id,
    title: 'テスト投稿'
  });
});
```

### ファクトリーステート

```typescript
test('ファクトリーステート使用', async ({ laravel }) => {
  // adminステートを適用
  const admin = await laravel.factory('User', {
    state: 'admin'
  });

  // 複数ステート
  const verifiedAdmin = await laravel.factory('User', {
    state: ['admin', 'verified']
  });

  // ステートとカスタム属性の組み合わせ
  const customAdmin = await laravel.factory('User', {
    state: 'admin',
    name: '管理者太郎'
  });
});
```

### 関連モデル

```typescript
test('関連モデルの作成', async ({ laravel }) => {
  // ユーザーとその投稿を作成
  const user = await laravel.factory('User');

  // hasMany関係
  const posts = await laravel.factory('Post', { user_id: user.id }, 3);

  // belongsTo関係（自動的に関連を作成）
  const comment = await laravel.factory('Comment', {
    post_id: posts[0].id,
    user_id: user.id
  });
});
```

## データベース操作

### クエリ実行

```typescript
test('データベースクエリ', async ({ laravel }) => {
  // SELECT
  const users = await laravel.query('SELECT * FROM users WHERE role = ?', ['admin']);

  // INSERT
  await laravel.query('INSERT INTO logs (message) VALUES (?)', ['Test log']);

  // UPDATE
  await laravel.query('UPDATE users SET verified = ? WHERE id = ?', [true, 1]);

  // DELETE
  await laravel.query('DELETE FROM sessions');
});
```

### テーブル操作

```typescript
test('テーブル操作', async ({ laravel }) => {
  // 全テーブルトランケート
  await laravel.truncate();

  // 特定テーブルのみ
  await laravel.truncate(['posts', 'comments']);
});
```

## セキュアな認証情報管理

E2Eテストでの認証情報の取り扱いに関するセキュリティガイドライン。

### 禁止事項

```typescript
// ❌ テストコード内に平文パスワードをハードコード
const password = 'password123';

// ❌ 本番環境の認証情報を使用
await page.fill('#email', 'admin@production.com');
await page.fill('#password', 'prodSecretPassword!');

// ❌ ソースコードにクレデンシャルをコミット
const API_KEY = 'sk-live-xxx...';
```

### 推奨パターン

```typescript
// ✅ ファクトリーで動的生成
const user = await laravel.factory('User', {
  email: 'test-' + Date.now() + '@example.com',
});

// ✅ 環境変数から取得
const testUser = {
  email: process.env.TEST_USER_EMAIL!,
  password: process.env.TEST_USER_PASSWORD!,
};

// ✅ ファクトリーのデフォルトパスワードを使用
// database/factories/UserFactory.php で定義されたパスワードを使用
const defaultPassword = 'password'; // ファクトリーデフォルト
```

### 環境変数設定

```env
# .env.testing
# テスト専用の認証情報（本番と異なる値を使用）
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123

# Playwrightが使用
PLAYWRIGHT_ENABLED=true
```

### 認証状態ファイル

```bash
# .gitignore
playwright/.auth/
```

認証状態ファイルは `playwright/.auth/` に保存し、Gitにコミットしないこと。

## 認証セットアップ

### 認証状態の保存

```typescript
// auth.setup.ts
import { test as setup } from '@hyvor/laravel-playwright';

const authFile = 'playwright/.auth/user.json';

setup('認証セットアップ', async ({ laravel, page }) => {
  // テストユーザー作成
  const user = await laravel.factory('User', {
    email: 'test@example.com',
    password: 'password123'
  });

  // ログイン
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(user.email);
  await page.getByLabel('パスワード').fill('password123');
  await page.getByRole('button', { name: 'ログイン' }).click();

  await page.waitForURL('/dashboard');

  // 認証状態を保存
  await page.context().storageState({ path: authFile });
});
```

### 設定ファイル

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/
    },
    {
      name: 'chromium',
      use: {
        storageState: 'playwright/.auth/user.json'
      },
      dependencies: ['setup']
    }
  ]
});
```

## テストパターン

### データ準備パターン

```typescript
test.describe('ユーザー管理', () => {
  test.beforeEach(async ({ laravel }) => {
    // 各テスト前にDBリセット
    await laravel.artisan('migrate:fresh');
    await laravel.artisan('db:seed', ['--class', 'RoleSeeder']);
  });

  test('ユーザー一覧表示', async ({ laravel, page }) => {
    // テストデータ準備
    await laravel.factory('User', {}, 10);

    await page.goto('/users');
    await expect(page.getByRole('row')).toHaveCount(11); // ヘッダー含む
  });

  test('ユーザー検索', async ({ laravel, page }) => {
    await laravel.factory('User', { name: '山田太郎' });
    await laravel.factory('User', { name: '田中次郎' });

    await page.goto('/users');
    await page.getByPlaceholder('検索').fill('山田');
    await page.getByRole('button', { name: '検索' }).click();

    await expect(page.getByRole('row')).toHaveCount(2);
    await expect(page.getByText('山田太郎')).toBeVisible();
  });
});
```

### 権限テストパターン

```typescript
test.describe('権限テスト', () => {
  test('管理者のみアクセス可能', async ({ laravel, page }) => {
    const admin = await laravel.factory('User', { state: 'admin' });

    // 管理者でログイン
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(admin.email);
    await page.getByLabel('パスワード').fill('password');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
  });

  test('一般ユーザーはアクセス拒否', async ({ laravel, page }) => {
    const user = await laravel.factory('User');

    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill(user.email);
    await page.getByLabel('パスワード').fill('password');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await page.goto('/admin/settings');
    await expect(page).toHaveURL(/403|forbidden/i);
  });
});
```

### フォーム送信パターン

```typescript
test('新規ユーザー登録', async ({ laravel, page }) => {
  await laravel.artisan('migrate:fresh');

  await page.goto('/register');

  await page.getByLabel('名前').fill('新規ユーザー');
  await page.getByLabel('メールアドレス').fill('new@example.com');
  await page.getByLabel('パスワード').fill('password123');
  await page.getByLabel('パスワード（確認）').fill('password123');
  await page.getByRole('button', { name: '登録' }).click();

  await expect(page).toHaveURL(/dashboard/);

  // DBで確認
  const users = await laravel.query(
    'SELECT * FROM users WHERE email = ?',
    ['new@example.com']
  );
  expect(users.length).toBe(1);
});
```

## CSRF対策

Laravel環境では`APP_ENV=testing`設定時にCSRF検証が自動スキップされる。手動で必要な場合:

```typescript
test('CSRFトークン取得', async ({ page }) => {
  await page.goto('/login');

  // ページからCSRFトークンを取得
  const csrfToken = await page.evaluate(() => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  });

  console.log('CSRF Token:', csrfToken);
});
```

## トラブルシューティング

### 接続エラー

```typescript
// Laravelサーバーが起動しているか確認
test.beforeAll(async ({ request }) => {
  const response = await request.get('/');
  expect(response.ok()).toBeTruthy();
});
```

### ファクトリーエラー

```php
// app/Models/User.php - ファクトリーが正しく定義されているか確認
protected static function newFactory()
{
    return \Database\Factories\UserFactory::new();
}
```

### 認証状態の問題

```typescript
// テスト間で認証状態が共有されないよう確認
test.describe.configure({ mode: 'serial' });
```
