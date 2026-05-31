# Playwright フィクスチャガイド

このドキュメントでは、Playwrightのフィクスチャ機能について詳しく説明する。
フィクスチャはテストのセットアップ・ティアダウンをカプセル化し、再利用可能なテストコンポーネントを作成するための強力な機能。

---

## 目次

- [ビルトインフィクスチャ一覧](#ビルトインフィクスチャ一覧)
- [カスタムフィクスチャの作成方法](#カスタムフィクスチャの作成方法)
- [スコープの違い（test vs worker）](#スコープの違いtest-vs-worker)
- [自動フィクスチャ（auto: true）](#自動フィクスチャauto-true)
- [グローバル beforeEach/afterEach の実装方法](#グローバル-beforeeachaftereach-の実装方法)
- [フィクスチャタイムアウト](#フィクスチャタイムアウト)
- [フィクスチャの実行順序](#フィクスチャの実行順序)
- [フィクスチャの6つの利点](#フィクスチャの6つの利点)
- [実践例: 認証付きテストのフィクスチャ](#実践例-認証付きテストのフィクスチャ)
- [Before/After フック vs フィクスチャの使い分け](#beforeafter-フック-vs-フィクスチャの使い分け)

---

## ビルトインフィクスチャ一覧

Playwrightが提供する標準フィクスチャ:

| フィクスチャ | 説明 | スコープ |
|------------|------|---------|
| `page` | テスト用の独立したブラウザページ | test |
| `context` | テスト用の独立したブラウザコンテキスト | test |
| `browser` | テスト間で共有されるブラウザインスタンス | worker |
| `browserName` | 現在のブラウザ名（chromium, firefox, webkit） | worker |
| `request` | テスト用のAPIリクエストコンテキスト | test |

## カスタムフィクスチャの作成方法

### 基本構文

`base.extend<T>()` を使用してカスタムフィクスチャを定義する:

```typescript
// fixtures/testSetup.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

// フィクスチャの型定義
type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

// カスタムフィクスチャを定義
export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
});

export { expect } from '@playwright/test';
```

### Setup/Teardownの統合

フィクスチャの最大の利点は、SetupとTeardownを同一箇所に記述できること:

```typescript
export const test = base.extend<{ todoPage: TodoPage }>({
  todoPage: async ({ page }, use) => {
    // === Setup（beforeEach相当）===
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.addToDo('初期アイテム');

    // === テスト実行 ===
    await use(todoPage);

    // === Teardown（afterEach相当）===
    await todoPage.removeAll();
  },
});
```

## スコープの違い（test vs worker）

### testスコープ（デフォルト）

各テストごとに新しいインスタンスが作成される:

```typescript
// 各テストで新しいページが作成される
myPage: async ({ page }, use) => {
  // デフォルトでtestスコープ
  await use(new MyPage(page));
}
```

### workerスコープ

ワーカープロセスごとに1回だけ作成され、複数のテストで共有される:

```typescript
// workerスコープの例: アカウント作成
account: [async ({ browser }, use, workerInfo) => {
  // ワーカーごとに固有のユーザー名
  const username = 'user' + workerInfo.workerIndex;

  // 一度だけアカウント作成
  const page = await browser.newPage();
  await page.goto('/signup');
  await page.getByLabel('ユーザー名').fill(username);
  await page.getByLabel('パスワード').fill('password');
  await page.getByRole('button', { name: '登録' }).click();
  await page.close();

  // 作成したアカウント情報を提供
  await use({ username, password: 'password' });
}, { scope: 'worker' }]
```

### スコープ選択ガイドライン

| ユースケース | 推奨スコープ | 理由 |
|-------------|-------------|------|
| ページオブジェクト | test | 各テストで独立したページが必要 |
| 認証セットアップ | worker | 一度の認証で複数テスト実行可能 |
| データベース接続 | worker | 接続のオーバーヘッドを削減 |
| 一時ファイル | test | テスト間の干渉を防止 |
| 共有リソース（API token等） | worker | 取得コストが高い場合 |

## 自動フィクスチャ（auto: true）

テストで明示的に指定しなくても自動的に実行されるフィクスチャ:

```typescript
export const test = base.extend<{ saveLogs: void }>({
  saveLogs: [async ({}, use, testInfo) => {
    const logs: string[] = [];

    // コンソールログをキャプチャ
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog.apply(console, args);
    };

    await use();

    // テスト失敗時のみログを保存
    if (testInfo.status !== testInfo.expectedStatus) {
      const logFile = testInfo.outputPath('logs.txt');
      await fs.promises.writeFile(logFile, logs.join('\n'), 'utf-8');
      testInfo.attachments.push({
        name: 'logs',
        path: logFile,
        contentType: 'text/plain',
      });
    }

    console.log = originalLog;
  }, { auto: true }],
});
```

### 自動フィクスチャの使用場面

| 用途 | 説明 |
|-----|------|
| ログ収集 | 失敗時のデバッグ情報を自動保存 |
| スクリーンショット | カスタム条件でのスクリーンショット取得 |
| パフォーマンス計測 | テスト実行時間の記録 |
| グローバルセットアップ | 全テストで必要な前処理 |

## グローバル beforeEach/afterEach の実装方法

全テストで共通の処理を実行したい場合:

```typescript
// fixtures/testSetup.ts
export const test = base.extend<{ forEachTest: void }>({
  forEachTest: [async ({ page }, use) => {
    // === 全テスト前に実行 ===
    // ベースURLに移動
    await page.goto('/');

    // コンソールエラーを監視
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await use();

    // === 全テスト後に実行 ===
    // コンソールエラーがあれば警告
    if (errors.length > 0) {
      console.warn('Console errors detected:', errors);
    }
  }, { auto: true }],
});
```

## フィクスチャタイムアウト

デフォルトでは、フィクスチャのセットアップ時間はテストタイムアウトに含まれる。
重い処理を行うフィクスチャには個別のタイムアウトを設定:

```typescript
heavyFixture: [async ({}, use) => {
  // 時間のかかる処理
  const data = await fetchLargeDataset();
  await use(data);
}, { timeout: 60000 }]  // 60秒
```

### タイムアウト設定のベストプラクティス

| フィクスチャ種別 | 推奨タイムアウト |
|----------------|----------------|
| ページオブジェクト初期化 | デフォルト（テストタイムアウト内） |
| データベースセットアップ | 30-60秒 |
| 外部APIからのデータ取得 | 60秒以上 |
| ファイルダウンロード | 状況に応じて設定 |

## フィクスチャの実行順序

フィクスチャは依存関係に基づいて自動的に順序付けられる:

```typescript
export const test = base.extend<{
  workerFixture: string;
  autoFixture: void;
  testFixture: string;
  dependentFixture: string;
}>({
  // 1. workerスコープのフィクスチャが最初に実行
  workerFixture: [async ({}, use) => {
    console.log('1. Worker fixture setup');
    await use('worker data');
    console.log('6. Worker fixture teardown');
  }, { scope: 'worker' }],

  // 2. 自動フィクスチャが次に実行
  autoFixture: [async ({}, use) => {
    console.log('2. Auto fixture setup');
    await use();
    console.log('5. Auto fixture teardown');
  }, { auto: true }],

  // 3. テストで使用されるフィクスチャ
  testFixture: async ({}, use) => {
    console.log('3. Test fixture setup');
    await use('test data');
    console.log('4. Test fixture teardown');
  },

  // 依存関係のあるフィクスチャ
  dependentFixture: async ({ testFixture }, use) => {
    // testFixtureに依存
    await use(`dependent on ${testFixture}`);
  },
});
```

実行順序:
1. workerフィクスチャ（worker）
2. autoフィクスチャ（test）
3. 依存順にtestフィクスチャ
4. テスト実行
5. testフィクスチャのteardown（逆順）
6. workerフィクスチャのteardown（ワーカー終了時）

## フィクスチャの6つの利点

| 利点 | 説明 | beforeEach/afterEachとの比較 |
|------|------|---------------------------|
| **Encapsulate** | Setup/Teardownを同じ場所に記述 | beforeEach/afterEachは分離 |
| **Reusable** | 複数のテストファイル間で再利用可能 | ファイル内のみ |
| **On-demand** | 必要なフィクスチャのみセットアップ | 常に全て実行 |
| **Composable** | フィクスチャ間で依存関係を定義可能 | 困難 |
| **Flexible** | テストごとに組み合わせを変更可能 | 固定的 |
| **Grouping** | describeブロックなしでテストをグループ化 | describe必須 |

## 実践例: 認証付きテストのフィクスチャ

```typescript
// fixtures/authFixtures.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

type AuthFixtures = {
  authenticatedPage: DashboardPage;
  adminPage: DashboardPage;
};

type AuthWorkerFixtures = {
  userCredentials: { email: string; password: string };
  adminCredentials: { email: string; password: string };
};

export const test = base.extend<AuthFixtures, AuthWorkerFixtures>({
  // ワーカースコープ: 認証情報の準備
  userCredentials: [async ({}, use, workerInfo) => {
    const email = `user${workerInfo.workerIndex}@example.com`;
    const password = 'password123';

    // ユーザー作成（APIまたはファクトリー経由）
    await createUser(email, password);

    await use({ email, password });

    // クリーンアップ
    await deleteUser(email);
  }, { scope: 'worker' }],

  // テストスコープ: 認証済みページ
  authenticatedPage: async ({ page, userCredentials }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(userCredentials.email, userCredentials.password);

    const dashboardPage = new DashboardPage(page);
    await expect(page).toHaveURL(/dashboard/);

    await use(dashboardPage);

    // ログアウト
    await dashboardPage.logout();
  },
});
```

使用例:

```typescript
// tests/dashboard.spec.ts
import { test, expect } from '../fixtures/authFixtures';

test('認証済みユーザーはダッシュボードを閲覧できる', async ({ authenticatedPage }) => {
  // 既にログイン済みの状態でテスト開始
  await expect(authenticatedPage.welcomeMessage).toBeVisible();
});

test('ウィジェットを追加できる', async ({ authenticatedPage }) => {
  await authenticatedPage.addWidget('売上グラフ');
  await expect(authenticatedPage.getWidget('売上グラフ')).toBeVisible();
});
```

## Before/After フック vs フィクスチャの使い分け

### フィクスチャを使うべき場合

- POMクラスのセットアップ
- 認証状態の準備（workerスコープ推奨）
- 複数ファイルで共通のセットアップ
- Setup/Teardownが対になっている処理
- テストデータの動的生成

### Before/After フックを使うべき場合

- 特定のdescribeブロック内のみで必要な処理
- シンプルな1行のセットアップ
- ファイル固有の設定変更
- デバッグ用の一時的なセットアップ

```typescript
// Before/Afterが適切な例
test.describe('特定の設定が必要なテスト群', () => {
  test.beforeEach(async ({ page }) => {
    // このdescribeブロック内のみで必要
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('モバイルビューでの表示', async ({ page }) => {
    // ...
  });
});
```
