# ビジュアルリグレッションテスト

ビジュアルリグレッションテストの概念とPercy統合パターンの参考ガイド。

**注意**: このドキュメントは将来的なPercy導入に向けた参考資料であり、現時点での実装は任意。

## 目次

- [ビジュアルリグレッションテストとは](#ビジュアルリグレッションテストとは)
- [Percy概要](#percy概要)
- [Page Object Modelとの統合](#page-object-modelとの統合)
- [マスク処理パターン](#マスク処理パターン)
- [レスポンシブテストパターン](#レスポンシブテストパターン)
- [状態安定化パターン](#状態安定化パターン)
- [導入検討のチェックリスト](#導入検討のチェックリスト)

---

## ビジュアルリグレッションテストとは

### 定義

UIの見た目の変化を自動検出するテスト手法。スクリーンショットを比較し、意図しないビジュアルの変更を検出する。

### 機能テストとの違い

| 観点 | 機能テスト | ビジュアルリグレッションテスト |
|------|----------|---------------------------|
| 検証対象 | 動作・ロジック | 見た目・レイアウト |
| 検出できる問題 | 機能バグ | CSSの崩れ、レイアウト変更 |
| 変更検出範囲 | テストに書いた範囲のみ | 画面全体 |
| メンテナンスコスト | 低〜中 | 中〜高（意図的な変更の承認作業） |

### 適用場面

- **デザインシステム導入時**: コンポーネントの一貫性維持
- **大規模リファクタリング**: 見た目に影響がないことの保証
- **クロスブラウザテスト**: 異なるブラウザでの表示確認
- **レスポンシブデザイン**: 各ブレイクポイントでの表示確認

---

## Percy概要

### Percyとは

BrowserStack社が提供するビジュアルテストプラットフォーム。スクリーンショットの取得、比較、レビューワークフローを統合提供する。

### 基本的なワークフロー

```
1. テスト実行時にスクリーンショット取得
   ↓
2. Percyクラウドにアップロード
   ↓
3. ベースラインと比較
   ↓
4. 差分があればレビュー画面で確認
   ↓
5. 承認 or 修正
```

### Playwright統合の基本例

```typescript
// Percy + Playwrightの基本的な使用例
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('ログイン画面のビジュアルテスト', async ({ page }) => {
  await page.goto('/login');

  // Percyスナップショット取得
  await percySnapshot(page, 'Login Page');
});
```

---

## Page Object Modelとの統合

### スナップショットメソッドの追加

Page Objectにビジュアルテスト用のメソッドを追加するパターン。

```typescript
// pages/auth/LoginPage.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class LoginPage extends BasePage {
  // 既存のロケーター定義...

  constructor(page: Page) {
    super(page);
    // ロケーター初期化...
  }

  // ビジュアルテスト用メソッド
  async captureSnapshot(name: string, options?: SnapshotOptions) {
    // Percy導入時にこのメソッドを実装
    // await percySnapshot(this.page, `Login - ${name}`, options);
  }

  // 状態別スナップショット
  async captureEmptyState() {
    await this.captureSnapshot('Empty Form');
  }

  async captureErrorState() {
    await this.captureSnapshot('With Validation Errors');
  }

  async captureLoadingState() {
    await this.captureSnapshot('Loading State');
  }
}

interface SnapshotOptions {
  widths?: number[];
  minHeight?: number;
  percyCSS?: string;
}
```

### テストでの使用

```typescript
// tests/auth/login-visual.spec.ts
import { test } from '../../fixtures/testSetup';

test.describe('ログイン画面 - ビジュアルテスト', () => {
  test('初期表示', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.captureEmptyState();
  });

  test('バリデーションエラー表示', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.signInButton.click(); // 空入力で送信
    await loginPage.captureErrorState();
  });
});
```

---

## マスク処理パターン

### なぜマスクが必要か

動的コンテンツ（日時、ランダムID、アニメーション等）はスナップショット毎に変化するため、誤った差分として検出される。マスク処理でこれを回避する。

### マスク対象の例

| 対象 | 理由 | マスク方法 |
|------|------|----------|
| 現在日時 | 実行時刻で変化 | 要素を非表示 or 固定値に置換 |
| ユーザーアバター | ランダム画像の場合 | プレースホルダー表示 |
| アニメーション | フレームにより変化 | アニメーション停止 |
| 広告枠 | 動的コンテンツ | 要素を非表示 |
| カウントダウン | 時間経過で変化 | 固定値に置換 |

### 実装例

```typescript
// utils/visualTestHelpers.ts
export async function hideElement(page: Page, selector: string) {
  await page.addStyleTag({
    content: `${selector} { visibility: hidden !important; }`
  });
}

export async function replaceContent(page: Page, selector: string, content: string) {
  await page.locator(selector).evaluateAll(
    (elements, text) => elements.forEach(el => el.textContent = text),
    content
  );
}

export async function stopAnimations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
  });
}
```

### Page Objectでの適用

```typescript
// pages/dashboard/DashboardPage.ts
export class DashboardPage extends BasePage {
  async prepareForSnapshot() {
    // 動的コンテンツをマスク
    await this.hideTimestamps();
    await this.stopAnimations();
    await this.stabilizeCharts();
  }

  private async hideTimestamps() {
    await this.page.addStyleTag({
      content: '[data-testid="timestamp"] { visibility: hidden; }'
    });
  }

  private async stopAnimations() {
    await this.page.addStyleTag({
      content: '* { animation: none !important; transition: none !important; }'
    });
  }

  private async stabilizeCharts() {
    // チャートのアニメーション完了を待機
    await this.page.waitForFunction(() => {
      const charts = document.querySelectorAll('[data-chart-loaded]');
      return charts.length > 0;
    });
  }

  async captureSnapshot(name: string) {
    await this.prepareForSnapshot();
    // await percySnapshot(this.page, `Dashboard - ${name}`);
  }
}
```

---

## レスポンシブテストパターン

### 複数ブレイクポイントでのテスト

```typescript
// 推奨ブレイクポイント
const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
  widescreen: 1920,
} as const;

// テストでの使用例
test.describe('レスポンシブ表示', () => {
  for (const [name, width] of Object.entries(BREAKPOINTS)) {
    test(`ログイン画面 - ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/login');
      // await percySnapshot(page, `Login - ${name}`, { widths: [width] });
    });
  }
});
```

### Page Objectでのビューポート対応

```typescript
// pages/base/BasePage.ts
export abstract class BasePage {
  protected readonly page: Page;

  async setMobileViewport() {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  async setTabletViewport() {
    await this.page.setViewportSize({ width: 768, height: 1024 });
  }

  async setDesktopViewport() {
    await this.page.setViewportSize({ width: 1280, height: 800 });
  }

  // レスポンシブスナップショット（全ブレイクポイント）
  async captureResponsiveSnapshots(name: string) {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 800 },
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      // await percySnapshot(this.page, `${name} - ${viewport.name}`);
    }
  }
}
```

---

## 状態安定化パターン

> **⚠️ 重要**: `networkidle` は**ビジュアルテストの安定化目的でのみ使用可能**。
> 通常のE2Eテストでは使用禁止（フレーキーテストの原因となる）。
> 可能な限り、特定のAPI応答待機（`waitForResponse`）や要素の表示待機に置き換えること。
> 詳細は `references/code-generation-checklist.md` の禁止パターンを参照。

### ネットワーク安定化

```typescript
// API応答を待ってからスナップショット（ビジュアルテスト専用）
async waitForNetworkIdle() {
  // ⚠️ ビジュアルテスト限定 - 通常のE2Eテストでは使用禁止
  await this.page.waitForLoadState('networkidle');
}

// 推奨: 特定のAPIレスポンスを待機（通常のE2Eテストでも使用可能）
async waitForDataLoad() {
  await this.page.waitForResponse(response =>
    response.url().includes('/api/data') && response.status() === 200
  );
}
```

### フォント読み込み待機

```typescript
async waitForFonts() {
  await this.page.evaluateHandle(() => document.fonts.ready);
}
```

### 画像読み込み待機

```typescript
async waitForImages() {
  await this.page.waitForFunction(() => {
    const images = Array.from(document.images);
    return images.every(img => img.complete);
  });
}
```

### 統合された安定化メソッド

> **⚠️ 注意**: このメソッドは**ビジュアルリグレッションテスト専用**。
> `networkidle` と `waitForTimeout` は通常のE2Eテストでは禁止パターン。

```typescript
// pages/base/BasePage.ts
export abstract class BasePage {
  /**
   * ビジュアルスナップショット取得前の安定化処理
   * ⚠️ ビジュアルテスト専用 - 通常のE2Eテストでは使用禁止
   */
  async stabilizeForSnapshot() {
    // ネットワーク安定化（ビジュアルテスト限定）
    await this.page.waitForLoadState('networkidle');

    // フォント読み込み
    await this.page.evaluateHandle(() => document.fonts.ready);

    // 画像読み込み
    await this.page.waitForFunction(() => {
      const images = Array.from(document.images);
      return images.every(img => img.complete);
    });

    // アニメーション停止
    await this.page.addStyleTag({
      content: '* { animation: none !important; transition: none !important; }'
    });

    // 少し待機（レンダリング完了のため - ビジュアルテスト限定）
    await this.page.waitForTimeout(100);
  }
}
```

---

## 導入検討のチェックリスト

### 導入すべき状況

- [ ] デザインの一貫性が重要なプロダクト
- [ ] 複数ブラウザ/デバイスのサポートが必要
- [ ] CSSの変更が頻繁に発生
- [ ] コンポーネントライブラリを構築中
- [ ] リファクタリングによる見た目への影響を検知したい

### 導入前の考慮事項

| 項目 | 確認内容 |
|------|---------|
| コスト | Percyは有料サービス（月額課金） |
| CI/CD統合 | ビルドパイプラインへの組み込み |
| レビューフロー | 差分承認のワークフロー設計 |
| メンテナンス | 意図的な変更時のベースライン更新作業 |
| 動的コンテンツ | マスク対象の洗い出しと実装 |

### 段階的導入のロードマップ

1. **Phase 1**: 静的ページ（ログイン、ランディング）でPoC
2. **Phase 2**: 主要画面（ダッシュボード、設定）に拡大
3. **Phase 3**: コンポーネントライブラリへの適用
4. **Phase 4**: 全画面への展開

### 代替ツール

| ツール | 特徴 |
|-------|------|
| Percy | クラウドベース、Playwright統合良好 |
| Chromatic | Storybook特化、コンポーネントテスト向け |
| Applitools | AI比較、高機能 |
| Playwright組み込みスナップショット | 無料、ローカル実行、シンプル |

---

## 参考リソース

- [Percy Documentation](https://docs.percy.io/)
- [Playwright Screenshots](https://playwright.dev/docs/screenshots)
- [Visual Testing Best Practices](https://docs.percy.io/docs/best-practices)
