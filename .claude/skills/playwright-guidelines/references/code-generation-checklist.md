# Code Generation Checklist

E2Eテストコード生成時の品質チェックリスト。コード生成後、すべての項目を検証し、違反があれば即座に修正すること。

---

## 目次

- [0. AI生成テストの意味的妥当性](#0-ai生成テストの意味的妥当性)
- [1. BasePage クラス](#1-basepage-クラス)
- [2. ロケーター](#2-ロケーター)
- [3. アサーションメソッド](#3-アサーションメソッド)
- [4. 命名規則](#4-命名規則)
- [5. Anti-Patterns（避けるべきこと）](#5-anti-patterns避けるべきこと)
- [自動検証](#自動検証)

---

## 0. AI生成テストの意味的妥当性

コードの体裁（セレクタ・命名等）が正しくても、**テストの意図が誤っていれば無価値**になる。AI生成テストは速い反面、次の欠陥が混入しやすいので、機械的チェックの前に**意味的な妥当性**を必ずレビューする。

### AI出力にありがちな欠陥

| 欠陥 | 兆候 | 対策 |
|------|------|------|
| **期待結果の誤り** | 仕様では「障害停止画面を表示して係員に通知」なのに、AIが「デフォルト値で起動」など一般論で期待結果を捏造 | 期待結果が**仕様（テストベース）に根拠づく**ことを確認。一般知識での補完を疑う |
| **説明根拠の不足** | 「対象コンポーネントは何か」「そのコンポーネントがどうなるか」の2視点が混ざり、十分性を判断できない | 1テスト＝1つの検証視点に分離。根拠（仕様ID / リスクID）を併記 |

### チェック項目

- [ ] **期待結果の出所**: 各アサーションの期待値が、画面仕様書・テスト仕様書など**テストベースに根拠づく**か（AIの一般知識による捏造でないか）
- [ ] **根拠の明記**: 各テスト（または describe）に、対象機能・リスク・期待結果の根拠（仕様ID等）が**追跡可能な形**で紐づいているか
- [ ] **視点の分離**: 「どのコンポーネントを対象にしたテストか」と「そのふるまいがどうなるか」が混在していないか
- [ ] **レベルの妥当性**: そもそも E2E（Large）で検証すべき内容か。仕様ロジック・分岐は下位レベルへ（`test-methodology-reviewer` の[テストサイズ/原因結果グラフ](../../test-methodology-reviewer/references/coverage-strategies.md)を参照）
- [ ] **レビュー容易性**: 期待結果・根拠が、人がレビューして合意できる粒度・表現になっているか

---

## 1. BasePage クラス

### 構造

- [ ] `export abstract class BasePage` として定義している
- [ ] `waitForSelector()` メソッドを提供していない（CSSセレクタを助長するため禁止）
- [ ] `waitForPageLoad()` メソッドを提供していない（`networkidle` は非推奨）
- [ ] `navigateTo()` が `protected` で、`page.goto()` のみを呼び出している
- [ ] `goto()` が `abstract` である

### アサーション

- [ ] `page.waitForFunction()` を使用していない
- [ ] `page.waitForLoadState('networkidle')` を使用していない（不安定の原因）
- [ ] Web-first Assertion（`expect().toHaveTitle()` 等）を使用している

### 必須テンプレート

```typescript
// tests/e2e/pages/base/BasePage.ts
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  abstract goto(): Promise<void>;

  // Auto-waiting に任せる - 手動待機は不要
  protected async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
  }

  // Web-first Assertion を使用
  async expectTitle(expectedTitle: string): Promise<void> {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  async waitForURL(url: string): Promise<void> {
    await this.page.waitForURL(url);
  }
}
```

**重要**:
- `waitForSelector(selector: string)` メソッドは**提供しない**こと
- `waitForPageLoad()` や `networkidle` は**使用しない**こと（Playwright公式で非推奨）

---

## 2. ロケーター

### セレクタ優先順位

- [ ] `getByRole()` を最優先で使用している
- [ ] `getByLabel()` をフォーム要素に使用している
- [ ] `getByTestId()` は最後の手段としてのみ使用している

### 禁止パターン

- [ ] `locator('[aria-label="..."]')` を使用していない
- [ ] `locator('.class')` を使用していない
- [ ] `locator('#id')` を使用していない
- [ ] `locator('//xpath')` を使用していない

### 正しい例

```typescript
// ボタン
this.submitButton = page.getByRole('button', { name: '送信' });

// フォームフィールド
this.emailInput = page.getByLabel('メールアドレス');

// 画像
this.preview = page.getByRole('img', { name: 'プレビュー画像' });
```

### 禁止例

```typescript
// CSSセレクタ禁止
this.submitButton = page.locator('.submit-btn');
this.emailInput = page.locator('[aria-label="メールアドレス"]');
this.preview = page.locator('[aria-label="プレビュー画像"]');
```

---

## 3. アサーションメソッド

### 正しい例

```typescript
async expectValidationError(field: string, message: string): Promise<void> {
  const fieldLocator = this.page.getByLabel(field);
  const errorLocator = fieldLocator
    .locator('..')
    .getByRole('alert')
    .or(fieldLocator.locator('..').getByText(message));
  await expect(errorLocator).toBeVisible();
}
```

### 禁止例

```typescript
async expectValidationError(field: string, message: string): Promise<void> {
  const errorLocator = this.page
    .locator(`[aria-label="${field}"]`)  // ❌ CSSセレクタ
    .locator('..')
    .getByText(message);
  await expect(errorLocator).toBeVisible();
}
```

---

## 4. 命名規則

- [ ] プロパティは名詞（`confirmDialog`, `submitButton`）
- [ ] メソッドは動詞で開始（`clickConfirmOk`, `fillEmail`, `expectSuccess`）
- [ ] プロパティとメソッドで同名を避けている

### 同名禁止の理由

プロパティとメソッドが同名だとTypeScriptでエラーになる。

```typescript
// ❌ 禁止
readonly confirmDialog: Locator;
async confirmDialog() { ... }  // エラー: 重複定義

// ✅ 正しい
readonly confirmDialog: Locator;
async clickConfirmOk() { ... }  // メソッド名を変更
```

---

## 5. Anti-Patterns（避けるべきこと）

| # | 禁止パターン | 正しい実装 |
|---|-------------|-----------|
| 1 | `export class BasePage` | `export abstract class BasePage` |
| 2 | `waitForSelector(selector: string)` メソッド | 削除（CSSセレクタを助長するため） |
| 3 | `waitForPageLoad()` / `networkidle` | 削除（Playwright公式で非推奨、フレーキーの原因） |
| 4 | `page.waitForFunction()` でのアサーション | `expect(page).toHaveTitle()` 等のWeb-first Assertion |
| 5 | `locator('[aria-label="..."]')` | `getByLabel('...')` または `getByRole('...', { name: '...' })` |
| 6 | `locator('.class')` / `locator('#id')` | ロールベースセレクタに変更 |
| 7 | プロパティとメソッドの同名定義 | メソッド名を変更（例: `confirmDialog` → `clickConfirmOk`） |

---

## 自動検証

生成されたコードに対して以下のパターンを自動検出し、修正すること：

```bash
# 禁止パターンの検出例
grep -E "export class BasePage" tests/e2e/pages/BasePage.ts
grep -E "waitForSelector" tests/e2e/pages/*.ts
grep -E "locator\('\.|\#|\[aria-label" tests/e2e/**/*.ts
```
