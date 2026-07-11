# E2E テスト設計技法

## 目次

1. [ユースケーステスト（Use Case Testing）](#1-ユースケーステストuse-case-testing)
2. [状態遷移テスト（State Transition Testing）](#2-状態遷移テストstate-transition-testing)
3. [Page Object Model（POM）](#3-page-object-modelpom)
4. [探索的テスト（Exploratory Testing）](#4-探索的テストexploratory-testing)
5. [ビジュアルリグレッションテスト](#5-ビジュアルリグレッションテスト)
6. [データ駆動テスト（Data-Driven Testing）](#6-データ駆動テストdata-driven-testing)
7. [テストの安定性パターン](#7-テストの安定性パターン)

---

## 1. ユースケーステスト（Use Case Testing）

実際のユーザーシナリオをテストする。ビジネス要件をそのままテストケースに変換する。

### 適用例: ユーザー登録フロー

```
シナリオ: 新規ユーザー登録
  前提条件: ユーザーは未登録の状態

  1. 登録画面にアクセスする
  2. メールアドレスを入力する
  3. パスワードを入力する
  4. 「登録」ボタンをクリックする
  5. 確認メールが送信される
  6. メール内のリンクをクリックする
  7. 登録完了画面が表示される
```

### 実装例（Playwright）

```typescript
test('新規ユーザーが登録を完了できる', async ({ page }) => {
  // 1. 登録画面にアクセス
  await page.goto('/register');

  // 2-3. フォーム入力
  await page.getByLabel('メールアドレス').fill('newuser@example.com');
  await page.getByLabel('パスワード').fill('SecurePass123!');
  await page.getByLabel('パスワード（確認）').fill('SecurePass123!');

  // 4. 登録ボタンをクリック
  await page.getByRole('button', { name: '登録' }).click();

  // 5-6. メール確認（テスト環境では自動承認）
  // 7. 登録完了画面の確認
  await expect(page.getByRole('heading', { name: '登録完了' })).toBeVisible();
});
```

---

## 2. 状態遷移テスト（State Transition Testing）

画面やコンポーネントの状態遷移を網羅的にテストする。

### 適用例: 注文ステータスの遷移

```
状態遷移図:

   ┌──────────┐  注文確定  ┌──────────┐
   │  カート   │──────────→│  注文済み │
   └──────────┘            └──────────┘
                                │
                    支払い完了   │  キャンセル
                    ↓           ↓
               ┌──────────┐  ┌──────────┐
               │  支払済み │  │キャンセル │
               └──────────┘  └──────────┘
                    │
             発送完了│
                    ↓
               ┌──────────┐
               │  発送済み │
               └──────────┘
                    │
             配達完了│
                    ↓
               ┌──────────┐
               │  完了    │
               └──────────┘
```

### テストケース一覧

| # | 開始状態 | イベント | 終了状態 | テスト |
|---|----------|----------|----------|--------|
| 1 | カート | 注文確定 | 注文済み | 正常遷移 |
| 2 | 注文済み | 支払い完了 | 支払済み | 正常遷移 |
| 3 | 注文済み | キャンセル | キャンセル | 正常遷移 |
| 4 | 支払済み | 発送完了 | 発送済み | 正常遷移 |
| 5 | 発送済み | 配達完了 | 完了 | 正常遷移 |
| 6 | カート | 支払い完了 | - | 無効遷移 |
| 7 | 完了 | キャンセル | - | 無効遷移 |

### 実装例（Playwright）

```typescript
test.describe('注文ステータス遷移', () => {
  test('注文確定 → 支払い → 発送 → 完了 の正常フロー', async ({ page }) => {
    // カート → 注文済み
    await page.goto('/cart');
    await page.getByRole('button', { name: '注文確定' }).click();
    await expect(page.getByText('注文済み')).toBeVisible();

    // 注文済み → 支払済み（管理画面で操作）
    await page.goto('/admin/orders/1');
    await page.getByRole('button', { name: '支払い確認' }).click();
    await expect(page.getByText('支払済み')).toBeVisible();

    // 支払済み → 発送済み
    await page.getByRole('button', { name: '発送完了' }).click();
    await expect(page.getByText('発送済み')).toBeVisible();

    // 発送済み → 完了
    await page.getByRole('button', { name: '配達完了' }).click();
    await expect(page.getByText('完了')).toBeVisible();
  });

  test('完了状態からはキャンセルできない', async ({ page }) => {
    // 完了状態の注文を表示
    await page.goto('/admin/orders/completed-order');

    // キャンセルボタンが無効化されている
    await expect(page.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
  });
});
```

---

## 3. Page Object Model（POM）

ページの操作をクラスにカプセル化し、テストコードの保守性を高める。

### 構造

```
tests/
├── pages/
│   ├── LoginPage.ts
│   ├── RegisterPage.ts
│   └── DashboardPage.ts
└── specs/
    ├── login.spec.ts
    └── register.spec.ts
```

### Page Object 実装例

```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  // ナビゲーション
  async goto() {
    await this.page.goto('/login');
  }

  // 要素のロケーター
  get emailInput() {
    return this.page.getByLabel('メールアドレス');
  }

  get passwordInput() {
    return this.page.getByLabel('パスワード');
  }

  get submitButton() {
    return this.page.getByRole('button', { name: 'ログイン' });
  }

  get errorMessage() {
    return this.page.getByRole('alert');
  }

  // アクション
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  // アサーション
  async expectLoginError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### テストでの使用例

```typescript
// specs/login.spec.ts
test.describe('ログイン機能', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('正しい認証情報でログインできる', async ({ page }) => {
    await loginPage.login('user@example.com', 'password123');

    // ダッシュボードにリダイレクトされる
    await expect(page).toHaveURL('/dashboard');
  });

  test('誤ったパスワードでエラーが表示される', async () => {
    await loginPage.login('user@example.com', 'wrong-password');

    await loginPage.expectLoginError('メールアドレスまたはパスワードが正しくありません');
  });
});
```

---

## 4. 探索的テスト（Exploratory Testing）

事前にシナリオを決めず、テスターの経験と直感でシステムを探索する。

### セッションベースの探索的テスト

```
セッション計画書
================
チャーター: 決済フローの境界値とエッジケースを探索する
タイムボックス: 45分
テスター: [名前]

探索メモ:
- [ ] 非常に高額な注文（999,999,999円）
- [ ] 0円の商品
- [ ] 在庫切れ商品の購入試行
- [ ] 決済中のブラウザバック
- [ ] 二重クリックでの二重注文
- [ ] セッション切れ後の決済試行

発見したバグ:
1. 10桁以上の金額でUIが崩れる
2. 在庫切れエラーメッセージが英語のまま
```

### 自動化の候補抽出

探索的テストで発見した重要なシナリオは自動化する。

```typescript
// 探索的テストで発見 → 自動化
test('二重クリックでも二重注文にならない', async ({ page }) => {
  await page.goto('/checkout');

  const submitButton = page.getByRole('button', { name: '注文確定' });

  // 二重クリックをシミュレート
  await submitButton.dblclick();

  // 注文は1件のみ
  await page.goto('/orders');
  await expect(page.getByRole('listitem')).toHaveCount(1);
});
```

---

## 5. ビジュアルリグレッションテスト

UIの視覚的な変更を検出する。

### Playwright でのスナップショットテスト

```typescript
test('ログインページのビジュアル', async ({ page }) => {
  await page.goto('/login');

  // ページ全体のスナップショット
  await expect(page).toHaveScreenshot('login-page.png');
});

test('エラー状態のフォーム', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'ログイン' }).click();

  // エラー状態のスナップショット
  await expect(page).toHaveScreenshot('login-page-with-errors.png');
});
```

### コンポーネント単位のスナップショット

```typescript
test('ボタンのバリエーション', async ({ page }) => {
  await page.goto('/storybook/button');

  const button = page.getByTestId('primary-button');
  await expect(button).toHaveScreenshot('primary-button.png');

  await button.hover();
  await expect(button).toHaveScreenshot('primary-button-hover.png');
});
```

---

## 6. データ駆動テスト（Data-Driven Testing）

外部データを使ってテストを繰り返す。

### CSVからテストデータを読み込む

```typescript
// testdata/login-scenarios.csv
// email,password,expectedResult
// valid@example.com,ValidPass123!,success
// invalid@example.com,wrong,error
// "",ValidPass123!,error

import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';

const testData = parse(readFileSync('testdata/login-scenarios.csv'), {
  columns: true,
  skip_empty_lines: true,
});

for (const { email, password, expectedResult } of testData) {
  test(`ログイン: ${email} → ${expectedResult}`, async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(email, password);

    if (expectedResult === 'success') {
      await expect(page).toHaveURL('/dashboard');
    } else {
      await loginPage.expectLoginError(/エラー/);
    }
  });
}
```

---

## 7. テストの安定性パターン

### 非同期処理の待機

```typescript
// NG: 固定時間の待機
await page.waitForTimeout(3000);

// OK: 要素の出現を待機
await expect(page.getByRole('alert')).toBeVisible();

// OK: ネットワークリクエストの完了を待機
await page.waitForResponse(response =>
  response.url().includes('/api/users') && response.status() === 200
);

// OK: ローディング完了を待機
await expect(page.getByTestId('loading-spinner')).not.toBeVisible();
```

### リトライパターン

```typescript
// playwright.config.ts
export default defineConfig({
  retries: 2, // 失敗時に2回リトライ
  expect: {
    timeout: 10000, // アサーションのタイムアウト
  },
  use: {
    actionTimeout: 15000, // アクションのタイムアウト
  },
});
```

### テストの独立性

```typescript
test.describe('ユーザー管理', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にデータをリセット
    await page.request.post('/api/test/reset-database');

    // ログイン状態を確保
    await page.goto('/login');
    await new LoginPage(page).login('admin@example.com', 'admin123');
  });

  test('ユーザーを作成できる', async ({ page }) => {
    // このテストは他のテストに依存しない
  });

  test('ユーザーを削除できる', async ({ page }) => {
    // このテストも他のテストに依存しない
  });
});
```
