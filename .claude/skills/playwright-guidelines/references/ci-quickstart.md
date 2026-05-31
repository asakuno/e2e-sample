# E2Eテスト環境 クイックスタート

E2Eテスト環境を素早くセットアップするためのコマンドと初期化スクリプト。

---

## 目次

- [1. プロジェクト初期化コマンド](#1-プロジェクト初期化コマンド)
- [2. 初期化スクリプトテンプレート](#2-初期化スクリプトテンプレート)
- [3. package.json スクリプト追加](#3-packagejson-スクリプト追加)
- [4. 次のステップ](#4-次のステップ)
- [5. 詳細設定](#5-詳細設定)

---

## 1. プロジェクト初期化コマンド

```bash
# 1. Playwright と依存関係のインストール
npm init playwright@latest

# 2. Laravel 統合パッケージのインストール
composer require hyvor/laravel-playwright --dev

# 3. Playwright ブラウザのインストール
npx playwright install --with-deps chromium

# 4. テストディレクトリ構造の作成
mkdir -p tests/e2e/{pages,tests,fixtures,specs}
mkdir -p tests/e2e/pages/{auth,dashboard}
mkdir -p tests/e2e/tests/{auth,dashboard}

# 5. 初期化スクリプトの実行（オプション）
./scripts/setup-e2e.sh
```

## 2. 初期化スクリプトテンプレート

以下のスクリプトを `scripts/setup-e2e.sh` として保存し、`chmod +x scripts/setup-e2e.sh` で実行権限を付与：

```bash
#!/bin/bash
# scripts/setup-e2e.sh
# E2Eテスト環境の初期化スクリプト

set -e

echo "🎭 E2Eテスト環境を初期化しています..."

# 色付き出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ステップ1: ディレクトリ構造の作成
echo -e "${YELLOW}[1/6] ディレクトリ構造を作成中...${NC}"
mkdir -p tests/e2e/{pages,tests,fixtures,specs}
mkdir -p tests/e2e/pages/{auth,dashboard,common}
mkdir -p tests/e2e/tests/{auth,dashboard}
mkdir -p tests/e2e/specs/{auth,dashboard}
mkdir -p .claude/specs/e2e/{auth,dashboard}
echo -e "${GREEN}✓ ディレクトリ構造を作成しました${NC}"

# ステップ2: Playwright設定ファイルの確認
echo -e "${YELLOW}[2/6] Playwright設定を確認中...${NC}"
if [ ! -f "playwright.config.ts" ]; then
    echo "playwright.config.ts が見つかりません。作成しますか？ (y/n)"
    read -r answer
    if [ "$answer" = "y" ]; then
        npx playwright init --quiet
        echo -e "${GREEN}✓ playwright.config.ts を作成しました${NC}"
    fi
else
    echo -e "${GREEN}✓ playwright.config.ts は既に存在します${NC}"
fi

# ステップ3: Laravel Playwright パッケージ
echo -e "${YELLOW}[3/6] Laravel Playwright パッケージを確認中...${NC}"
if ! grep -q "hyvor/laravel-playwright" composer.json 2>/dev/null; then
    echo "hyvor/laravel-playwright をインストールしますか？ (y/n)"
    read -r answer
    if [ "$answer" = "y" ]; then
        composer require hyvor/laravel-playwright --dev
        php artisan vendor:publish --tag=playwright-config
        echo -e "${GREEN}✓ hyvor/laravel-playwright をインストールしました${NC}"
    fi
else
    echo -e "${GREEN}✓ hyvor/laravel-playwright は既にインストールされています${NC}"
fi

# ステップ4: ブラウザのインストール
echo -e "${YELLOW}[4/6] Playwright ブラウザを確認中...${NC}"
if ! npx playwright --version > /dev/null 2>&1; then
    npm install -D @playwright/test
fi
if ! npx playwright install --with-deps chromium; then
    echo -e "${RED}✗ Chromiumのインストールに失敗しました${NC}"
    echo "手動で実行してください: npx playwright install --with-deps"
    exit 1
fi
echo -e "${GREEN}✓ Chromium ブラウザをインストールしました${NC}"

# ステップ5: BasePage の作成
echo -e "${YELLOW}[5/6] BasePage を確認中...${NC}"
if [ ! -f "tests/e2e/pages/BasePage.ts" ]; then
    cat > tests/e2e/pages/BasePage.ts << 'EOF'
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
EOF
    echo -e "${GREEN}✓ BasePage.ts を作成しました${NC}"
else
    echo -e "${GREEN}✓ BasePage.ts は既に存在します${NC}"
fi

# ステップ6: testSetup.ts の作成
echo -e "${YELLOW}[6/6] testSetup.ts を確認中...${NC}"
if [ ! -f "tests/e2e/fixtures/testSetup.ts" ]; then
    cat > tests/e2e/fixtures/testSetup.ts << 'EOF'
import { test as baseTest, expect } from '@playwright/test';

// Page Object をここにインポート
// import { AuthLoginPage } from '../pages/auth/AuthLoginPage';

type Pages = {
  // Page Object の型定義をここに追加
  // authLoginPage: AuthLoginPage;
};

export const test = baseTest.extend<Pages>({
  // Page Object のフィクスチャをここに追加
  // authLoginPage: async ({ page }, use) => {
  //   const authLoginPage = new AuthLoginPage(page);
  //   await authLoginPage.goto();
  //   await use(authLoginPage);
  // },
});

export { expect };
EOF
    echo -e "${GREEN}✓ testSetup.ts を作成しました${NC}"
else
    echo -e "${GREEN}✓ testSetup.ts は既に存在します${NC}"
fi

echo ""
echo -e "${GREEN}🎉 E2Eテスト環境の初期化が完了しました！${NC}"
echo ""
echo "次のステップ:"
echo "  1. playwright.config.ts を環境に合わせて調整"
echo "  2. /designing-e2e-specs でテスト仕様書を作成"
echo "  3. /implementing-e2e-specs でテストコードを生成"
echo ""
echo "テスト実行:"
echo "  npx playwright test                    # 全テスト実行"
echo "  npx playwright test --ui               # UIモードで実行"
echo "  npx playwright test --debug            # デバッグモードで実行"
```

## 3. package.json スクリプト追加

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:debug": "playwright test --debug",
    "e2e:report": "playwright show-report",
    "e2e:setup": "./scripts/setup-e2e.sh"
  }
}
```

## 4. 次のステップ

| ステップ | コマンド | 説明 |
|---------|---------|------|
| 環境セットアップ | `npm run e2e:setup` または `./scripts/setup-e2e.sh` | ディレクトリ構造とBasePage作成 |
| テスト仕様書作成 | `/designing-e2e-specs docs/specs/auth/login.md` | 画面仕様書からテスト仕様書生成 |
| テストコード生成 | `/implementing-e2e-specs tests/e2e/specs/auth/login.spec.md` | 仕様書からPlaywrightコード生成 |
| テスト実行 | `npm run e2e` | 全E2Eテスト実行 |
| レポート確認 | `npm run e2e:report` | HTMLレポート表示 |

## 5. 詳細設定

詳細なCI/CD設定については [ci-config.md](ci-config.md) を参照：

- playwright.config.ts 本番向け設定
- GitHub Actions ワークフロー
- Docker対応
- シャーディング（並列実行）
- トラブルシューティング
