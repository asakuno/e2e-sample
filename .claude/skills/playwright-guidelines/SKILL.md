---
name: playwright-guidelines
description: E2Eテスト仕様書の作成とPlaywrightテストコード生成のガイドライン。画面仕様書（Excel/Markdown）から日本語テスト仕様書を作成し、Playwrightテストコードを生成する2ステップワークフロー。Laravel + Inertia.js + React環境に特化し、自前のtesting用Artisanコマンド連携（reset/factory/scenario）でテストデータを準備する。型安全なテストデータ管理（Interface + Factory パターン）を含む。/designing-e2e-specs（仕様書作成）と/implementing-e2e-specs（テスト実装）の2コマンドで実行。E2Eテスト、Playwright、テスト仕様書、POM、Page Object Model、ブラウザテスト自動化、画面テスト、結合テスト、Dataクラスに使用。
---

# Playwright E2E Testing Guidelines

## Required References

このスキルを読み込んだ後、以下のファイルをReadツールで読み込むこと。

**必須**（常に読み込む）:
- `references/pom-patterns.md` - Page Object Model の詳細パターン（ディレクトリ構造、セレクタ分離含む）
- `references/selector-strategy.md` - セレクタ戦略の詳細（優先順位、ロールベースセレクタ）
- `references/code-generation-checklist.md` - コード生成時の品質チェックリスト

**条件付き**（該当時のみ）:
- `references/selector-separation.md` - セレクタ分離管理パターンの詳細が必要な場合
- `references/fixtures-guide.md` - カスタムフィクスチャ、スコープ、自動フィクスチャの詳細が必要な場合
- `references/data-patterns.md` - テストデータパターン（Interface + Factory）の詳細が必要な場合
- `references/scenario-derivation.md` - 画面遷移図・アクティビティ図からE2Eシナリオを導出する場合（Phase 1）
- `references/laravel-test-data-setup.md` - Laravel連携（自前 testing コマンド + TSラッパー）でE2Eテストデータを準備する場合
- `references/impl-plan-templates.md` - 実装計画書テンプレート（/implementing-e2e-specs 用）が必要な場合
- `references/test-stability.md` - テスト安定性のベストプラクティスが必要な場合
- `references/security-testing.md` - セキュリティテストパターン（XSS/CSRF検証）が必要な場合
- `references/visual-regression.md` - ビジュアルリグレッションテストが必要な場合
- `references/ci-config.md` - CI/CD 設定の詳細が必要な場合
- `references/ci-quickstart.md` - E2E 環境クイックスタート・初期化が必要な場合
- `references/examples/login-example.md` - ログイン画面の完全実装例を参照する場合

---

画面仕様書からE2Eテスト仕様書を作成し、Playwrightテストコードを生成するためのガイドライン。

## Overview

このスキルは以下の2ステップワークフローを提供する:

1. **Phase 1: 仕様書作成** (`/designing-e2e-specs`)
   - 画面仕様書（Excel/Markdown）を入力として受け取る
   - 日本語でE2Eテスト仕様書を作成
   - ユーザー承認後にPhase 2へ

2. **Phase 2: テスト実装** (`/implementing-e2e-specs`)
   - 承認済みテスト仕様書をもとにPlaywrightテストコードを生成
   - Page Object Model（POM）パターンを適用
   - testing用Artisanコマンド連携（reset/factory/scenario）でLaravelのテストデータを準備

## Quick Reference

### テスト仕様書作成時のチェックリスト

- [ ] 画面単位でテストケースを整理
- [ ] 正常系・異常系・境界値を網羅
- [ ] **バリデーションルール100%網羅（必須）**
- [ ] 前提条件（認証状態、データ状態）を明記
- [ ] 操作手順を具体的に記述
- [ ] 期待結果を検証可能な形式で記述
- [ ] テストIDを一意に付与（画面名_機能_連番）
- [ ] **トレーサビリティマトリクスを作成（必須）**
- [ ] **品質チェックで70%以上のスコアを達成**

### テストコード作成時のチェックリスト

- [ ] Page Object Modelパターンを適用
- [ ] ロールベースロケーター優先（`getByRole`, `getByLabel`）
- [ ] `data-testid`は最後の手段
- [ ] Auto-waitingを信頼（手動waitは禁止）
- [ ] Web-first Assertionsを使用
- [ ] AAAパターン（Arrange-Act-Assert）を遵守
- [ ] テスト間の状態分離を確保

## ディレクトリ構成

### 推奨構造（ドメイン別 + セレクタ分離）

```
tests/e2e/
├── specs/                    # テスト仕様書（Markdown）
│   ├── auth/
│   │   └── login.spec.md
│   └── dashboard/
│       └── widgets.spec.md
├── tests/                    # Playwrightテストコード
│   ├── auth/
│   │   └── login.spec.ts
│   └── dashboard/
│       └── widgets.spec.ts
├── pages/                    # Page Object Models
│   ├── base/
│   │   └── BasePage.ts       # 基底クラス
│   ├── auth/                 # 認証ドメイン
│   │   ├── LoginPage.ts
│   │   ├── RegisterPage.ts
│   │   ├── types/            # ドメイン固有の型定義
│   │   │   └── AuthTypes.ts
│   │   └── selectors/        # セレクタ分離
│   │       ├── loginSelectors.ts
│   │       └── registerSelectors.ts
│   ├── dashboard/            # ダッシュボードドメイン
│   │   ├── DashboardPage.ts
│   │   └── selectors/
│   │       └── dashboardSelectors.ts
│   └── components/           # 共通コンポーネント
│       ├── NavigationComponent.ts
│       └── selectors/
│           └── navigationSelectors.ts
├── types/                    # 共通型定義（複数ドメインで共有）
│   └── CommonTypes.ts
├── fixtures/                 # カスタムフィクスチャ
│   └── testSetup.ts
├── utils/                    # ヘルパー関数
│   ├── dataFactory.ts
│   └── testHelpers.ts
└── auth.setup.ts             # 認証セットアップ
```

### 規模別推奨構造

| プロジェクト規模 | Page Object数 | 推奨構造 |
|---------------|--------------|---------|
| 小規模 | 1-3 | フラット構造（pages/直下） |
| 中規模 | 4-10 | ドメイン別構造 |
| 大規模 | 10+ | ドメイン別 + セレクタ分離必須 |

## Phase 1: テスト仕様書作成

### 入力形式

画面仕様書は以下の形式をサポート:

- **Markdown形式**: `.md`ファイル
- **Excel形式**: `.xlsx`ファイル（テキスト抽出して解析）

### テスト仕様書フォーマット

画面単位でMarkdown表形式のテスト仕様書を作成:

```markdown
# [画面名] E2Eテスト仕様書

## 画面概要
- **画面ID**: SCR-001
- **画面名**: ログイン画面
- **URL**: /login
- **認証**: 不要

## 前提条件
- テスト用ユーザーが存在すること
- セッションがクリアされていること

## テストケース

| テストID | テスト名 | 前提条件 | 操作手順 | 期待結果 | 優先度 |
|----------|----------|----------|----------|----------|--------|
| LOGIN_001 | 正常ログイン | テストユーザー存在 | 1. /loginにアクセス<br>2. メールアドレス入力<br>3. パスワード入力<br>4. ログインボタンクリック | ダッシュボード画面に遷移 | 高 |
| LOGIN_002 | 無効なパスワード | テストユーザー存在 | 1. /loginにアクセス<br>2. メールアドレス入力<br>3. 誤ったパスワード入力<br>4. ログインボタンクリック | エラーメッセージ「認証情報が正しくありません」表示 | 高 |
| LOGIN_003 | 未入力エラー | - | 1. /loginにアクセス<br>2. 何も入力せずログインボタンクリック | バリデーションエラー表示 | 中 |

## データ要件
- ユーザー: Laravelファクトリーで動的生成（セキュリティのため、クレデンシャルはハードコード禁止）
- 認証情報: `.env.testing` で管理、または `playwright/.auth/` にセキュアに保存

## トレーサビリティマトリクス

| 画面要素ID | 要素名 | テストケース | カバレッジ状況 |
|-----------|--------|-------------|--------------|
| ELEM_001 | メールアドレス入力 | LOGIN_001, LOGIN_002, LOGIN_003 | 正常系✓ 異常系✓ 境界値✓ |
| ELEM_002 | パスワード入力 | LOGIN_001, LOGIN_002, LOGIN_003 | 正常系✓ 異常系✓ 境界値✓ |
| ELEM_003 | ログインボタン | LOGIN_001, LOGIN_002, LOGIN_003 | 正常系✓ 異常系✓ |
| ELEM_004 | エラーメッセージ | LOGIN_002, LOGIN_003 | 異常系✓ |
```

### 仕様書作成の考慮事項

#### 1. テストケースの網羅性

**正常系**:
- 基本的な操作フロー
- 代替フロー（複数の正常パス）

**異常系**:
- バリデーションエラー（**仕様書記載の全ルールを網羅**）
- 認証・認可エラー
- サーバーエラー

**境界値**:
- 空入力
- 最大長入力
- 特殊文字

### バリデーションルール100%網羅（必須）

画面仕様書に記載されているすべてのバリデーションルールに対応するテストケースを作成すること。

| バリデーション種別 | テストケースの作成基準 |
|------------------|---------------------|
| **必須チェック** | 未入力/未選択時のエラー表示テスト |
| **文字数チェック** | 最大文字数+1の入力でエラー + 最大文字数での正常（境界値） |
| **形式チェック** | 不正形式の入力でエラー表示テスト |
| **範囲チェック** | 範囲外の値でエラー + 境界値での正常テスト |
| **相関チェック** | 項目間の整合性エラーテスト |
| **ファイルチェック** | ファイル形式、サイズ、画像サイズ等のエラーテスト |

**品質ゲート**: バリデーションカバレッジ100%未満の場合は不合格。不足テストケースを追加するまで次に進めない。

#### 2. 優先度の設定

| 優先度 | 説明 | 実装タイミング |
|--------|------|----------------|
| 高 | クリティカルパス、主要機能 | 必須 |
| 中 | 準主要機能、エラーハンドリング | 推奨 |
| 低 | エッジケース、UIの細かい確認 | 任意 |

#### 3. E2E化するシナリオの選定（何をE2Eにするか）

E2E は最も遅く不安定化しやすい Large レベル。**仕様の分岐ロジックまで E2E に積まない**。

- **E2E（Large）に残すのは**「ユーザー価値の高い代表シナリオ」「統合境界」「Happy path」「重大リスク」に限定する。
- **仕様ロジック・入力条件の組み合わせ**は下位レベル（同値分割・境界値・原因結果グラフ→デシジョンテーブル）へ落とす。
- 選定の判断軸（テストサイズ × リスクベース選定、リグレッション≠E2E）の詳細は `test-methodology-reviewer` の `references/coverage-strategies.md` を参照。
- E2E に置くと決めたシナリオは、**データ準備も Large 相応に明示**する（`references/laravel-test-data-setup.md`）。

#### 4. 画面遷移図・アクティビティ図からのシナリオ導出

シナリオは思いつきで挙げず、**画面遷移図 × アクティビティ図から再現可能に導出**する（遷移エッジを基準に網羅 → 操作可能な手順列に展開 → Happy path/重大リスクを Large に昇格）。手順の詳細は [references/scenario-derivation.md](references/scenario-derivation.md) を参照。

## テストセットアップ戦略

### フィクスチャ vs Before/After フック

Playwrightでは**フィクスチャの使用を推奨**。フィクスチャはSetup/Teardownを同一箇所に記述でき、複数ファイル間で再利用可能。

| ユースケース | 推奨アプローチ |
|-------------|--------------|
| POMクラスのセットアップ | フィクスチャ |
| 認証状態の準備 | フィクスチャ（workerスコープ） |
| 複数ファイルで共通のセットアップ | フィクスチャ |
| 特定のdescribeブロック内のみ | beforeEach/afterEach |
| シンプルな1行のセットアップ | beforeEach |

### スコープ選択ガイドライン

| スコープ | 実行タイミング | 用途 |
|---------|--------------|------|
| `test`（デフォルト） | 各テストごと | ページ、一時データ |
| `worker` | ワーカーごと1回 | DB接続、認証セットアップ |

```typescript
// カスタムフィクスチャの基本例
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    // Setup
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await use(loginPage);  // テスト実行

    // Teardown（同じ場所で記述可能）
  },
});
```

詳細は [references/fixtures-guide.md](references/fixtures-guide.md) を参照。

## Phase 2: テストコード実装

### テストデータパターン

テストデータの型安全な管理には Interface + Factory パターンを使用する。詳細は [references/data-patterns.md](references/data-patterns.md) を参照。

### Page Object Model

詳細は [references/pom-patterns.md](references/pom-patterns.md) を参照。

```typescript
// pages/auth/LoginPage.ts - 詳細は references/pom-patterns.md 参照
import { type Page, type Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('メールアドレス');
    this.passwordInput = page.getByLabel('パスワード');
    this.signInButton = page.getByRole('button', { name: 'ログイン' });
  }

  async goto() { await this.navigateTo('/login'); }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
```

### セレクタ戦略

詳細は [references/selector-strategy.md](references/selector-strategy.md) を参照。

**優先順位**:
1. `getByRole()` - ボタン、チェックボックス、見出し、リンク
2. `getByLabel()` - ラベル付きフォーム要素
3. `getByPlaceholder()` - プレースホルダー付き入力欄
4. `getByText()` - 非インタラクティブ要素
5. `getByTestId()` - 明示的なテスト用契約（最後の手段）

### Laravel連携（自前 testing コマンド + TSラッパー）

外部パッケージに依存せず、testing環境専用のArtisanコマンド（`testing:reset` / `testing:factory` / `testing:scenario`）を薄いTSラッパー（`laravel` fixture）から叩いてテストデータを準備する。詳細は [references/laravel-test-data-setup.md](references/laravel-test-data-setup.md) を参照。

```typescript
import { test, expect } from '../fixtures/laravel';

test('データベースセットアップ付きテスト', async ({ laravel, page }) => {
  // DBリセット（土台データはseederへ）
  await laravel.reset({ seed: true });

  // 許可リストの論理名でファクトリー生成（クラス名は渡さない）
  const { model: user } = await laravel.factory<{ model: { id: number; name: string } }>(
    'user',
    { name: '山田太郎' },
  );

  // テスト実行
  await page.goto(`/users/${user.id}`);
  // ...
});
```

### テストコード構造

```typescript
// tests/auth/login.spec.ts
import { test, expect } from '../../fixtures/testSetup';

test.describe('ログイン画面', () => {
  test('LOGIN_001: 正常ログイン', async ({ loginPage, page }) => {
    // Arrange
    const email = 'user@example.com';
    const password = 'password123';

    // Act
    await loginPage.login(email, password);

    // Assert
    await expect(page).toHaveURL(/dashboard/);
  });

  test('LOGIN_002: 無効なパスワードでエラー表示', async ({ loginPage }) => {
    // Arrange
    const email = 'user@example.com';
    const invalidPassword = 'wrongpassword';

    // Act
    await loginPage.login(email, invalidPassword);

    // Assert
    await loginPage.expectError('認証情報が正しくありません');
  });
});
```

## 禁止事項

### 絶対に避けるべきパターン

```typescript
// ❌ 手動待機（フレーキーの原因）
await page.waitForTimeout(3000);

// ❌ CSSセレクタ（DOM構造に依存）
page.locator('button.btn-primary.submit-form');
page.locator('#app > div:nth-child(2) > form > button');

// ❌ Generic assertion（リトライなし）
expect(await page.getByText('ようこそ').isVisible()).toBe(true);

// ❌ テスト間で状態を共有
let sharedState: string;
test('テスト1', async () => { sharedState = 'value'; });
test('テスト2', async () => { console.log(sharedState); }); // 依存
```

### 必ず守るべきパターン

```typescript
// ✅ Auto-waitingを信頼
await page.getByRole('button', { name: '送信' }).click();

// ✅ ロールベースロケーター
page.getByRole('button', { name: '送信' });
page.getByLabel('ユーザー名');

// ✅ Web-first assertion
await expect(page.getByText('ようこそ')).toBeVisible();

// ✅ テスト間の独立性
test('テスト1', async ({ page }) => { /* 独立した状態 */ });
test('テスト2', async ({ page }) => { /* 独立した状態 */ });
```

## CI/CD設定

完全な `playwright.config.ts`（本番向け・GitHub Actions・Docker対応）は [references/ci-config.md](references/ci-config.md) を参照。要点のみ:

- `testDir: './tests/e2e'`（`*.setup.ts` も発見対象に含めるため `tests/` 直下に絞らない）
- `setup` プロジェクト（`testMatch: /.*\.setup\.ts/`）を用意し、ブラウザプロジェクトは `dependencies: ['setup']` ＋ `testIgnore: /.*\.setup\.ts/`（二重実行防止）
- `storageState: 'playwright/.auth/user.json'` で認証状態を再利用
- 共有DB前提のため初期は `workers: 1`。並列化はDB分離とセットで検討（`references/laravel-test-data-setup.md`）

## Reference Documentation

詳細なガイドラインと実装パターン:

### 基本パターン

- **[references/pom-patterns.md](references/pom-patterns.md)**: Page Object Modelの詳細パターン（ディレクトリ構造、セレクタ分離含む）
- **[references/selector-separation.md](references/selector-separation.md)**: セレクタ分離管理パターン（`as const`型推論、ドメイン別構造）
- **[references/selector-strategy.md](references/selector-strategy.md)**: セレクタ戦略の詳細（優先順位、ロールベースセレクタ）
- **[references/fixtures-guide.md](references/fixtures-guide.md)**: フィクスチャの詳細ガイド（カスタムフィクスチャ、スコープ、自動フィクスチャ）
- **[references/data-patterns.md](references/data-patterns.md)**: テストデータパターン（Interface + Factory、型安全なデータ管理、Laravel Factoryとの使い分け）
- **[references/scenario-derivation.md](references/scenario-derivation.md)**: 画面遷移図・アクティビティ図からのE2Eシナリオ導出（遷移網羅基準、Large昇格の判断）

### コード生成・品質

- **[references/code-generation-checklist.md](references/code-generation-checklist.md)**: コード生成時の品質チェックリスト（禁止パターン、BasePage要件）
- **[references/impl-plan-templates.md](references/impl-plan-templates.md)**: 実装計画書テンプレート（/implementing-e2e-specs用）

### 統合・テスト

- **[references/laravel-test-data-setup.md](references/laravel-test-data-setup.md)**: Laravel連携でのE2Eテストデータ準備（自前 testing コマンド + TSラッパー、許可リスト + シナリオseeder + JSON契約）
- **[references/security-testing.md](references/security-testing.md)**: セキュリティテストパターン（XSS/CSRF検証）
- **[references/test-stability.md](references/test-stability.md)**: テスト安定性のベストプラクティス
- **[references/visual-regression.md](references/visual-regression.md)**: ビジュアルリグレッションテスト（Percy連携参考）

### CI/CD

- **[references/ci-config.md](references/ci-config.md)**: CI/CD設定詳細
- **[references/ci-quickstart.md](references/ci-quickstart.md)**: E2E環境クイックスタート・初期化スクリプト

### 実装例

- **[references/examples/login-example.md](references/examples/login-example.md)**: ログイン画面の完全実装例

## Summary

1. **仕様書ファースト**: 画面仕様書→テスト仕様書→テストコードの順序を厳守
2. **画面単位の粒度**: 画面ごとにテストケースを整理
3. **バリデーション100%網羅**: 仕様書記載の全バリデーションルールをテストでカバー（必須）
4. **POMパターン**: 保守性を高めるためPage Object Modelを適用
5. **ロールベースセレクタ**: ユーザー視点のセレクタを優先
6. **Auto-waiting活用**: 手動待機は禁止、Playwrightの自動待機を信頼
7. **Laravel連携**: 自前の testing 用Artisanコマンド（reset/factory/scenario）でテストデータを準備（外部パッケージ非依存・許可リスト・JSON契約固定）
