# 実装計画書テンプレート

E2Eテスト実装計画書のテンプレートとガイドライン。

---

## 目次

- [実装計画書フォーマット](#実装計画書フォーマット)
- [実装ルール](#実装ルール)
- [完全な実装例](#完全な実装例)
- [コードテンプレート](#コードテンプレート)

---

## 実装計画書フォーマット

```markdown
# {画面名} E2E実装計画書

## 参照仕様書
- パス: {テスト仕様書パス}
- 画面ID: {画面ID}
- テストケース数: {正常系X件, 異常系Y件, 境界値Z件}

## Playwright環境
- 設定ファイル: playwright.config.ts
- ベースURL: {baseURL}
- Laravel統合: {hyvor/laravel-playwright使用有無}

## カバレッジサマリー

| タイプ | 対象件数 | 実装件数 | カバレッジ |
|--------|---------|---------|-----------|
| 正常系 | X | - | 0% |
| 異常系 | Y | - | 0% |
| 境界値 | Z | - | 0% |
| **合計** | **N** | **0** | **0%** |

※ 実装完了後、各タイプの実装件数とカバレッジを更新すること

## Page Object設計

### {Category}{Screen}Page
- 継承: BasePage
- ファイル: tests/e2e/pages/{category}/{Category}{Screen}Page.ts

#### ロケーター一覧
| 名前 | セレクタ種別 | セレクタ値 | 代替セレクタ | DOM確認結果 |
|------|-------------|-----------|-------------|------------|
| {locatorName} | `getByLabel` | `'メールアドレス'` | `getByRole('textbox')` | ✓ `<input aria-label="メールアドレス">` |
| {locatorName} | `getByRole` | `'button', { name: 'ログイン' }` | `getByText('ログイン')` | ✓ `<button>ログイン</button>` |

#### アクションメソッド一覧
| メソッド名 | 引数 | 処理内容 |
|-----------|------|---------|
| {methodName}(args) | {型定義} | {処理の説明} |

#### アサーションメソッド一覧
| メソッド名 | 検証内容 |
|-----------|---------|
| {methodName}() | {検証内容の説明} |

## テストコード設計

### ファイル構成
- tests/e2e/tests/{category}/{screen}.spec.ts

### テストケース一覧
| テストID | テスト名 | AAAパターン概要 |
|----------|----------|----------------|
| {ID} | {name} | Arrange: {準備内容}, Act: {操作内容}, Assert: {検証内容} |

### 正常系テストケース詳細
#### {テストID}: {テスト名}
- **Arrange**: {前提条件・データ準備}
- **Act**: {実行する操作}
- **Assert**: {期待結果の検証}

### 異常系テストケース詳細
#### {テストID}: {テスト名}
- **Arrange**: {前提条件・データ準備}
- **Act**: {実行する操作}
- **Assert**: {エラー検証}

### 境界値テストケース詳細
#### {テストID}: {テスト名}
- **Arrange**: {境界値データ準備}
- **Act**: {実行する操作}
- **Assert**: {境界条件の検証}

## フィクスチャ設計

### testSetup.ts
- Page Objectの自動初期化
- カスタムフィクスチャ定義

### テストデータ設計

| モデル | ファクトリー | ステート | カスタム属性 | 用途 |
|--------|-------------|---------|-------------|------|
| User | UserFactory | - | `{ email: 'test@example.com', password: 'password123' }` | 正常ログイン用ユーザー |
| User | UserFactory | unverified | `{ email: 'unverified@example.com' }` | 未認証エラーテスト用 |
| User | UserFactory | admin | `{ email: 'admin@example.com' }` | 管理者権限テスト用 |

### テストデータ（固定値）
| データ種別 | 値 | 用途 |
|-----------|-----|------|
| {dataType} | {value} | {用途の説明} |

## 実装手順

1. [ ] BasePage確認・作成
2. [ ] {Category}{Screen}Page生成
3. [ ] testSetup.ts更新
4. [ ] テストコード生成（正常系）
5. [ ] テストコード生成（異常系）
6. [ ] テストコード生成（境界値）
7. [ ] テスト実行・検証
8. [ ] カバレッジサマリー更新
9. [ ] 完了レポート

## 完了レポートフォーマット

実装完了時に以下のレポートを生成：

```markdown
# 実装完了レポート

## 実装サマリー
- 画面: {画面名}
- 実装日: {YYYY-MM-DD}
- 実装者: Claude Code

## カバレッジ結果

| タイプ | 対象件数 | 実装件数 | カバレッジ |
|--------|---------|---------|-----------|
| 正常系 | X | X | 100% |
| 異常系 | Y | Y | 100% |
| 境界値 | Z | Z | 100% |
| **合計** | **N** | **N** | **100%** |

## テスト実行結果
- 成功: {X}件
- 失敗: {Y}件
- スキップ: {Z}件

## 生成ファイル
- Page Object: tests/e2e/pages/{category}/{Category}{Screen}Page.ts
- テストコード: tests/e2e/tests/{category}/{screen}.spec.ts
- フィクスチャ更新: tests/e2e/fixtures/testSetup.ts

## 次のアクション
- [ ] コードレビュー依頼
- [ ] CI/CDでの実行確認
- [ ] 他画面との統合テスト
```
```

## 実装ルール

### テストコード作成のルール

1. **AAAパターン遵守**: Arrange-Act-Assert の構造を厳守
2. **テスト独立性**: 各テストは他のテストに依存しない
3. **手動waitは禁止**: `waitForTimeout()` を使用しない、Auto-waitingを信頼
4. **Web-first Assertions**: `expect(locator).toBeVisible()` を使用

### セレクタのルール

1. **ロールベース優先**: `getByRole()`, `getByLabel()` を最優先
2. **CSSセレクタ禁止**: クラス名やIDに依存しない
3. **XPath禁止**: DOM構造に依存しない
4. **TestIDは最後の手段**: 上記で特定できない場合のみ

### セレクタ優先順位

1. `getByRole()` - ボタン、チェックボックス、見出し、リンク
2. `getByLabel()` - ラベル付きフォーム要素
3. `getByPlaceholder()` - プレースホルダー付き入力欄
4. `getByText()` - 非インタラクティブ要素
5. `getByTestId()` - 上記で特定できない場合のみ（最後の手段）

---

## 完全な実装例

テンプレートの各セクションがどのように記述されるかを示す具体的な実装例。

詳細は以下を参照:
- **[examples/login-example.md](examples/login-example.md)**: ログイン画面の完全実装例（9テストケース、Page Object、テストコード）

実装例には以下が含まれる:
- Page Object設計（ロケーター一覧、アクション/アサーションメソッド）
- テストケース詳細（正常系2件、異常系4件、境界値3件）
- フィクスチャ設計（テストデータ設計テーブル）
- 完全なTypeScriptコード（Page Object + テストコード）
- トレーサビリティマトリクス

---

## コードテンプレート

### BasePage

```typescript
// tests/e2e/pages/BasePage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  readonly header: Locator;
  readonly footer: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.getByRole('banner');
    this.footer = page.getByRole('contentinfo');
    this.loadingIndicator = page.getByRole('progressbar');
  }

  abstract goto(): Promise<void>;

  async waitForPageLoad() {
    await expect(this.loadingIndicator).toBeHidden({ timeout: 10000 });
  }

  async expectTitle(title: string) {
    await expect(this.page).toHaveTitle(title);
  }
}
```

### Page Object

```typescript
// tests/e2e/pages/{category}/{Category}{Screen}Page.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';

export class {Category}{Screen}Page extends BasePage {
  readonly {locatorName}: Locator;

  constructor(page: Page) {
    super(page);
    this.{locatorName} = page.{セレクタ種別}('{セレクタ値}');
  }

  async goto() {
    await this.page.goto('/{endpoint}');
  }

  // アクションメソッド
  async {methodName}({args}) {
    // 処理内容
  }

  // アサーションメソッド
  async {assertMethodName}() {
    // 検証内容
  }
}
```

### フィクスチャ

```typescript
// tests/e2e/fixtures/testSetup.ts
import { test as baseTest, expect } from '@playwright/test';
import { {Category}{Screen}Page } from '../pages/{category}/{Category}{Screen}Page';

type Pages = {
  {category}{Screen}Page: {Category}{Screen}Page;
};

export const test = baseTest.extend<Pages>({
  {category}{Screen}Page: async ({ page }, use) => {
    const {category}{Screen}Page = new {Category}{Screen}Page(page);
    await {category}{Screen}Page.goto();
    await use({category}{Screen}Page);
  },
});

export { expect };
```

### テストコード

```typescript
// tests/e2e/tests/{category}/{screen}.spec.ts
import { test, expect } from '../../fixtures/testSetup';

test.describe('{画面名}', () => {
  test.describe('正常系', () => {
    test('{テストID}: {テスト名}', async ({ {category}{Screen}Page, page }) => {
      // Arrange
      // ...

      // Act
      // ...

      // Assert
      // ...
    });
  });

  test.describe('異常系', () => {
    test('{テストID}: {テスト名}', async ({ {category}{Screen}Page }) => {
      // Arrange / Act / Assert
    });
  });

  test.describe('境界値', () => {
    test('{テストID}: {テスト名}', async ({ {category}{Screen}Page }) => {
      // Arrange / Act / Assert
    });
  });
});
```
