# Code Generation Checklist

E2Eテストコード生成時の品質チェックリスト。コード生成後、すべての項目を検証し、違反があれば即座に修正すること。

---

## 目次

- [1. BasePage クラス](#1-basepage-クラス)
- [2. ロケーター](#2-ロケーター)
- [3. アサーションメソッド](#3-アサーションメソッド)
- [4. 命名規則](#4-命名規則)
- [5. Anti-Patterns（避けるべきこと）](#5-anti-patterns避けるべきこと)
- [自動検証](#自動検証)

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
