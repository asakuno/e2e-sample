# テスト安定性のベストプラクティス

フレーキー（不安定な）テストを防ぎ、信頼性の高いテストスイートを維持するためのガイドライン。

## 目次

- [Auto-waitingの理解](#auto-waitingの理解)
- [Web-first Assertions](#web-first-assertions)
- [テスト分離](#テスト分離)
- [ネットワークモッキング](#ネットワークモッキング)
- [フレーキーテストの検出と対処](#フレーキーテストの検出と対処)
- [よくあるフレーキーパターンと対処法](#よくあるフレーキーパターンと対処法)
- [デバッグツール](#デバッグツール)
- [パフォーマンス最適化](#パフォーマンス最適化)

## Auto-waitingの理解

Playwrightは**アクション実行前に自動的に要素の状態をチェック**する。手動での待機処理は原則不要。

### 自動待機される条件

| 条件 | 説明 |
|------|------|
| アタッチ済み | DOMに存在している |
| 可視 | 表示されている（visibility:hiddenでない） |
| 安定 | アニメーション中でない |
| 有効 | disabledでない |
| イベント受信可能 | 他の要素に覆われていない |

### 正しい使い方

```typescript
// ✅ Playwrightが自動的に待機する
await page.getByRole('button', { name: '送信' }).click();

// ✅ 要素が表示されるまで自動待機
await page.getByText('ようこそ').click();

// ✅ ナビゲーション完了を自動待機
await page.goto('/dashboard');
```

### 絶対に避けるべきパターン

```typescript
// ❌ 任意の時間待機（フレーキーの原因）
await page.waitForTimeout(3000);

// ❌ 固定時間のスリープ
await new Promise(resolve => setTimeout(resolve, 1000));

// ❌ 不要な待機
await page.waitForSelector('.button');
await page.click('.button'); // waitForSelectorは不要
```

## Web-first Assertions

### 自動リトライするアサーション

**Web-first assertions**は条件が満たされるまで自動リトライする:

```typescript
// ✅ Web-first assertion（自動リトライ、デフォルト5秒）
await expect(page.getByText('ようこそ')).toBeVisible();
await expect(page.locator('.status')).toHaveText('送信完了');
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveTitle(/ダッシュボード/);

// ✅ 要素の状態をチェック
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('checkbox')).toBeChecked();
await expect(page.getByRole('textbox')).toHaveValue('テスト');

// ✅ 複数要素のカウント
await expect(page.getByRole('listitem')).toHaveCount(5);

// ✅ 属性チェック
await expect(page.getByRole('link')).toHaveAttribute('href', '/home');
```

### 避けるべきパターン

```typescript
// ❌ Generic assertion（リトライなし、フレーキーの原因）
expect(await page.getByText('ようこそ').isVisible()).toBe(true);

// ❌ 即座に失敗する
const text = await page.locator('.message').textContent();
expect(text).toBe('成功'); // 要素が遅れて表示されると失敗

// ❌ 手動での待機とアサーション
await page.waitForSelector('.message');
const content = await page.locator('.message').textContent();
expect(content).toBe('成功');
```

### 正しい置き換え

```typescript
// ✅ 正しい書き方
await expect(page.locator('.message')).toHaveText('成功');

// ✅ 部分一致
await expect(page.locator('.message')).toContainText('成功');

// ✅ 正規表現
await expect(page.locator('.message')).toHaveText(/成功|完了/);
```

## テスト分離

### ブラウザコンテキストの分離

Playwrightは**各テストに独立したBrowserContextを自動生成**する:

```typescript
test('テスト1', async ({ page, context }) => {
  // このcontextはテスト1専用
  await page.evaluate(() => localStorage.setItem('key', 'value'));
});

test('テスト2', async ({ page }) => {
  // テスト1とは完全に分離されている
  const value = await page.evaluate(() => localStorage.getItem('key'));
  expect(value).toBeNull(); // 共有されていない！
});
```

### データベースの分離

```typescript
test.beforeEach(async ({ laravel }) => {
  // 各テスト前にDBリセット（laravel fixture 経由 / testing:reset を実行）
  await laravel.reset();
});

// または
test.describe.configure({ mode: 'serial' });
test.beforeAll(async ({ laravel }) => {
  await laravel.reset({ seed: true });
});
```

> **注意**: `migrate:fresh` をテストごとに実行すると遅く不安定になりやすい。原則は globalSetup で1回リセットし、各テストは必要なデータだけを生成する方針が望ましい（[laravel-test-data-setup.md](laravel-test-data-setup.md) 参照）。

### 避けるべきパターン

```typescript
// ❌ テスト間で状態を共有
let sharedUser: { id: number };

test('ユーザー作成', async ({ laravel }) => {
  const { model } = await laravel.factory<{ model: { id: number } }>('user');
  sharedUser = model;
});

test('ユーザー更新', async ({ page }) => {
  // sharedUserに依存 - テスト順序に依存してしまう
  await page.goto(`/users/${sharedUser.id}`);
});
```

### 正しいパターン

```typescript
// ✅ 各テストで必要なデータを作成
test('ユーザー更新', async ({ laravel, page }) => {
  const { model: user } = await laravel.factory<{ model: { id: number } }>('user');
  await page.goto(`/users/${user.id}`);
});
```

## ネットワークモッキング

### 外部依存の排除

```typescript
test('APIレスポンスをモック', async ({ page }) => {
  // APIリクエストをインターセプト
  await page.route('**/api/products', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'テスト商品', price: 2999 }
      ])
    });
  });

  await page.goto('/products');
  await expect(page.getByText('テスト商品')).toBeVisible();
});
```

### エラーレスポンスのテスト

```typescript
test('APIエラー時のハンドリング', async ({ page }) => {
  // ネットワークエラーをシミュレート
  await page.route('**/api/data', route => route.abort());

  await page.goto('/');
  await expect(page.getByText('データの読み込みに失敗しました')).toBeVisible();
});

test('500エラー時のハンドリング', async ({ page }) => {
  await page.route('**/api/data', route => {
    route.fulfill({
      status: 500,
      body: 'Internal Server Error'
    });
  });

  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('サーバーエラー');
});
```

### HARファイルの活用

```typescript
test('HARファイルからレスポンスを再生', async ({ page }) => {
  // 事前に記録したレスポンスを再生
  await page.routeFromHAR('tests/fixtures/api.har', {
    url: '**/api/**',
    update: false  // trueで記録、falseで再生
  });

  await page.goto('/');
});
```

## フレーキーテストの検出と対処

### failOnFlakyTests設定

```typescript
// playwright.config.ts
export default defineConfig({
  // フレーキーテストを検出したら失敗
  failOnFlakyTests: true,

  // リトライ設定
  retries: 2
});
```

### テスト名による識別

```typescript
// 不安定なテストにマーカーを付ける
test.fixme('不安定: ネットワーク依存テスト', async ({ page }) => {
  // 修正が必要なテスト
});

test.skip('スキップ: 環境依存テスト', async ({ page }) => {
  // 特定環境でのみ実行
});
```

### 条件付きスキップ

```typescript
test('Windows専用テスト', async ({ page }) => {
  test.skip(process.platform !== 'win32', 'Windowsでのみ実行');
  // ...
});

test('CI環境でスキップ', async ({ page }) => {
  test.skip(!!process.env.CI, 'ローカルでのみ実行');
  // ...
});
```

## よくあるフレーキーパターンと対処法

### 1. アニメーション待ち

```typescript
// ❌ アニメーション中にクリック
await page.getByRole('button').click();

// ✅ CSSでアニメーション無効化（推奨）
await page.addStyleTag({
  content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }'
});

// ⚠️ networkidleは使用しない（フレーキーの原因）
// await page.goto('/', { waitUntil: 'networkidle' }); // 非推奨
```

### 2. 非同期データ読み込み

```typescript
// ❌ データ読み込み前にアサート
await page.goto('/dashboard');
expect(await page.locator('.data').textContent()).toBe('100');

// ✅ Web-first assertionで待機
await page.goto('/dashboard');
await expect(page.locator('.data')).toHaveText('100');
```

### 3. モーダル/ポップオーバー

```typescript
// ✅ モーダルが完全に表示されるまで待機
await page.getByRole('button', { name: '削除' }).click();
await expect(page.getByRole('dialog')).toBeVisible();
await page.getByRole('button', { name: '確認' }).click();
await expect(page.getByRole('dialog')).toBeHidden();
```

### 4. ページ遷移

```typescript
// ✅ URL変更を待機
await page.getByRole('link', { name: '詳細' }).click();
await expect(page).toHaveURL(/\/details\//);

// ✅ または特定の要素を待機
await page.getByRole('link', { name: '詳細' }).click();
await expect(page.getByRole('heading', { name: '詳細情報' })).toBeVisible();
```

### 5. フォーム送信

```typescript
// ✅ 送信完了を適切に待機
await page.getByRole('button', { name: '送信' }).click();
await expect(page.getByText('送信完了')).toBeVisible();
// または
await expect(page).toHaveURL('/success');
```

## デバッグツール

### Trace Viewer

```bash
# トレースを有効にして実行
npx playwright test --trace on

# トレースを表示
npx playwright show-trace trace.zip
```

### UI Mode

```bash
# UIモードで実行（ステップバイステップデバッグ）
npx playwright test --ui
```

### Headed Mode

```bash
# ブラウザを表示して実行
npx playwright test --headed

# スローモーション
npx playwright test --headed --slowmo 500
```

### コードジェネレーター

```bash
# 操作を記録してコード生成
npx playwright codegen http://localhost:8000
```

## パフォーマンス最適化

### 並列実行

```typescript
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined // ローカルでは自動
});
```

### 認証の再利用

```typescript
// auth.setup.ts で一度だけログイン
// 認証状態をファイルに保存して再利用
```

### 不要なリソースのブロック

```typescript
test.beforeEach(async ({ page }) => {
  // 画像・フォント・分析をブロック
  await page.route('**/*.{png,jpg,jpeg,gif,webp,svg}', route => route.abort());
  await page.route('**/analytics/**', route => route.abort());
  await page.route('**/fonts/**', route => route.abort());
});
```
