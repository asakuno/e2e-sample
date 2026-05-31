# Page Object Model パターン

Page Object Model（POM）は、UIテストの保守性を劇的に向上させる設計パターン。ページの構造をクラスとしてカプセル化することで、UIが変更されても修正箇所を1箇所に限定できる。

## 目次

- [基本構造](#基本構造)
- [ディレクトリ構造](#ディレクトリ構造)
- [セレクタ分離パターン](#セレクタ分離パターン)
- [Fixture統合](#fixture統合)
- [コンポーネントパターン](#コンポーネントパターン)
- [テーブル・リストパターン](#テーブルリストパターン)
- [フォームパターン](#フォームパターン)
- [ベストプラクティス](#ベストプラクティス)

## 基本構造

### BasePage クラス

すべてのページクラスの基底クラス。**必須要件**に注意すること。

#### 必須要件

| 要件 | 説明 |
|------|------|
| `abstract class` | `export abstract class BasePage` として定義（`export class` は禁止） |
| `waitForSelector()` 禁止 | CSSセレクタを助長するため提供しない |
| `navigateTo()` は `protected` | サブクラスからのみ呼び出し可能 |
| `goto()` は `abstract` | 各ページで実装必須 |

#### 基本実装

```typescript
// pages/BasePage.ts
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

**重要**: `waitForSelector(selector: string)` メソッドは**提供しない**こと。詳細は `references/code-generation-checklist.md` を参照。

---

## ディレクトリ構造

### ドメイン別ディレクトリ構造

プロジェクト規模に応じてPage Object、セレクタ、型定義をドメイン別に整理する。

```
tests/e2e/
├── pages/
│   ├── base/
│   │   └── BasePage.ts              # 基底クラス
│   ├── auth/                         # 認証ドメイン
│   │   ├── LoginPage.ts
│   │   ├── RegisterPage.ts
│   │   ├── types/                    # ドメイン固有の型
│   │   │   └── AuthTypes.ts
│   │   └── selectors/
│   │       ├── loginSelectors.ts
│   │       └── registerSelectors.ts
│   ├── dashboard/                    # ダッシュボードドメイン
│   │   ├── DashboardPage.ts
│   │   ├── types/
│   │   │   └── DashboardTypes.ts
│   │   └── selectors/
│   │       └── dashboardSelectors.ts
│   ├── users/                        # ユーザー管理ドメイン
│   │   ├── UserListPage.ts
│   │   ├── UserFormPage.ts
│   │   ├── types/                    # ドメイン固有の型
│   │   │   └── UserTypes.ts
│   │   └── selectors/
│   │       ├── userListSelectors.ts
│   │       └── userFormSelectors.ts
│   └── components/                   # 共通コンポーネント
│       ├── NavigationComponent.ts
│       ├── HeaderComponent.ts
│       └── selectors/
│           ├── navigationSelectors.ts
│           └── headerSelectors.ts
├── types/                            # 共通型（必要時のみ）
│   └── CommonTypes.ts
├── fixtures/
│   └── testSetup.ts
├── tests/
│   ├── auth/
│   │   └── login.spec.ts
│   ├── dashboard/
│   │   └── dashboard.spec.ts
│   └── users/
│       └── userList.spec.ts
└── utils/
```

**型ファイル配置基準**:
- ドメイン固有の型（`LoginCredentials`, `UserFormData`）→ `pages/{domain}/types/`
- 複数ドメインで共有する型（`Pagination`, `DeepPartial`）→ `types/`
- 詳細は [references/data-patterns.md](data-patterns.md) を参照

### 命名規則

| 種類 | 命名規則 | 例 |
|------|---------|-----|
| Page Object | `{Feature}Page.ts` | `LoginPage.ts`, `UserListPage.ts` |
| Component | `{Name}Component.ts` | `NavigationComponent.ts` |
| セレクタファイル | `{pageName}Selectors.ts` | `loginSelectors.ts` |
| 型ファイル | `{Domain}Types.ts` | `AuthTypes.ts`, `UserTypes.ts` |
| テストファイル | `{feature}.spec.ts` | `login.spec.ts` |
| ドメインディレクトリ | ケバブケース禁止 | `auth/`, `dashboard/` |

### 規模別推奨構造

| プロジェクト規模 | Page Object数 | 推奨構造 |
|---------------|--------------|---------|
| 小規模 | 1-3 | フラット構造（pages/直下） |
| 中規模 | 4-10 | ドメイン別構造 |
| 大規模 | 10+ | ドメイン別 + セレクタ分離必須 |

---

## セレクタ分離パターン

### なぜセレクタを分離するのか

Page Object内にセレクタ文字列が散在すると、UIラベル変更時に複数箇所の修正が必要になる。セレクタを専用ファイルに抽出することで保守性が向上する。

詳細は [references/selector-separation.md](selector-separation.md) を参照。

### 基本パターン

```typescript
// pages/auth/selectors/loginSelectors.ts
export const LoginSelectors = {
  // ラベルテキスト（getByLabel用）
  emailInput: 'メールアドレス',
  passwordInput: 'パスワード',

  // ロールベースセレクタ（getByRole用）
  signInButton: { role: 'button', name: 'ログイン' },
  errorMessage: { role: 'alert' },
  forgotPasswordLink: { role: 'link', name: 'パスワードを忘れた方' },
} as const;
```

### Page Objectでの使用

```typescript
// pages/auth/LoginPage.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { LoginSelectors as S } from './selectors/loginSelectors';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    super(page);
    // セレクタオブジェクトを参照
    this.emailInput = page.getByLabel(S.emailInput);
    this.passwordInput = page.getByLabel(S.passwordInput);
    this.signInButton = page.getByRole(S.signInButton.role, { name: S.signInButton.name });
  }

  // アクションメソッドは従来通り
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
```

### 導入基準

| 状況 | セレクタ分離 |
|------|------------|
| Page Object 3件未満 | 任意（インラインでもOK） |
| Page Object 3件以上 | 推奨 |
| チーム開発（2名以上） | 強く推奨 |
| UIの頻繁な変更が予想される | 必須 |

---

### 具象ページクラス

```typescript
// pages/LoginPage.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    super(page);
    // ロケーターはコンストラクタで定義（遅延評価される）
    this.emailInput = page.getByLabel('メールアドレス');
    this.passwordInput = page.getByLabel('パスワード');
    this.signInButton = page.getByRole('button', { name: 'ログイン' });
    this.errorMessage = page.getByRole('alert');
    this.forgotPasswordLink = page.getByRole('link', { name: 'パスワードを忘れた方' });
    this.rememberMeCheckbox = page.getByRole('checkbox', { name: 'ログイン状態を保持' });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async loginWithRememberMe(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.rememberMeCheckbox.check();
    await this.signInButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectNoError() {
    await expect(this.errorMessage).toBeHidden();
  }

  async goToForgotPassword() {
    await this.forgotPasswordLink.click();
  }
}
```

## Fixture統合

### カスタムフィクスチャ定義

```typescript
// fixtures/testSetup.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { UserListPage } from '../pages/UserListPage';

type TestFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  userListPage: UserListPage;
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  userListPage: async ({ page }, use) => {
    await use(new UserListPage(page));
  },
});

export { expect } from '@playwright/test';
```

### フィクスチャを使用したテスト

```typescript
// tests/auth/login.spec.ts
import { test, expect } from '../../fixtures/testSetup';

test.describe('ログイン画面', () => {
  test('有効な認証情報でログインできる', async ({ loginPage, page }) => {
    await loginPage.login('user@example.com', 'password123');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('無効な認証情報でエラーが表示される', async ({ loginPage }) => {
    await loginPage.login('invalid@example.com', 'wrongpassword');
    await loginPage.expectError('認証情報が正しくありません');
  });

  test('パスワードリセットリンクが機能する', async ({ loginPage, page }) => {
    await loginPage.goToForgotPassword();
    await expect(page).toHaveURL(/password\/reset/);
  });
});
```

## コンポーネントパターン

### 再利用可能なコンポーネント

複数ページで使用されるUIコンポーネントを分離:

```typescript
// components/NavigationComponent.ts
import { type Page, type Locator } from '@playwright/test';

export class NavigationComponent {
  readonly page: Page;
  readonly homeLink: Locator;
  readonly dashboardLink: Locator;
  readonly settingsLink: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    const nav = page.getByRole('navigation');
    this.homeLink = nav.getByRole('link', { name: 'ホーム' });
    this.dashboardLink = nav.getByRole('link', { name: 'ダッシュボード' });
    this.settingsLink = nav.getByRole('link', { name: '設定' });
    this.userMenu = page.getByRole('button', { name: 'ユーザーメニュー' });
    this.logoutButton = page.getByRole('menuitem', { name: 'ログアウト' });
  }

  async goToHome() {
    await this.homeLink.click();
  }

  async goToDashboard() {
    await this.dashboardLink.click();
  }

  async goToSettings() {
    await this.settingsLink.click();
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}
```

### コンポーネントをページに組み込む

```typescript
// pages/DashboardPage.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { NavigationComponent } from '../components/NavigationComponent';

export class DashboardPage extends BasePage {
  readonly navigation: NavigationComponent;
  readonly welcomeMessage: Locator;
  readonly statsCards: Locator;

  constructor(page: Page) {
    super(page);
    this.navigation = new NavigationComponent(page);
    this.welcomeMessage = page.getByRole('heading', { name: /ようこそ/ });
    this.statsCards = page.getByTestId('stats-card');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async expectWelcomeMessage(userName: string) {
    await expect(this.welcomeMessage).toContainText(userName);
  }

  async getStatsCount(): Promise<number> {
    return await this.statsCards.count();
  }
}
```

## テーブル・リストパターン

### テーブルページオブジェクト

```typescript
// pages/UserListPage.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class UserListPage extends BasePage {
  readonly table: Locator;
  readonly rows: Locator;
  readonly searchInput: Locator;
  readonly addUserButton: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    super(page);
    this.table = page.getByRole('table');
    this.rows = this.table.getByRole('row');
    this.searchInput = page.getByPlaceholder('ユーザーを検索');
    this.addUserButton = page.getByRole('button', { name: 'ユーザーを追加' });
    this.pagination = page.getByRole('navigation', { name: 'ページネーション' });
  }

  async goto() {
    await this.page.goto('/users');
  }

  async searchUser(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async getUserRow(email: string): Promise<Locator> {
    return this.rows.filter({ hasText: email });
  }

  async editUser(email: string) {
    const row = await this.getUserRow(email);
    await row.getByRole('button', { name: '編集' }).click();
  }

  async deleteUser(email: string) {
    const row = await this.getUserRow(email);
    await row.getByRole('button', { name: '削除' }).click();
    // 確認ダイアログ
    await this.page.getByRole('button', { name: '確認' }).click();
  }

  async expectUserCount(count: number) {
    // ヘッダー行を除外
    await expect(this.rows).toHaveCount(count + 1);
  }

  async goToPage(pageNumber: number) {
    await this.pagination.getByRole('button', { name: String(pageNumber) }).click();
  }
}
```

## フォームパターン

### フォームページオブジェクト

```typescript
// pages/UserFormPage.ts
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base/BasePage';

interface UserFormData {
  name: string;
  email: string;
  role: string;
  department?: string;
  isActive?: boolean;
}

export class UserFormPage extends BasePage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly roleSelect: Locator;
  readonly departmentInput: Locator;
  readonly isActiveCheckbox: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly validationErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.getByLabel('名前');
    this.emailInput = page.getByLabel('メールアドレス');
    this.roleSelect = page.getByLabel('役割');
    this.departmentInput = page.getByLabel('部署');
    this.isActiveCheckbox = page.getByRole('checkbox', { name: '有効' });
    this.submitButton = page.getByRole('button', { name: '保存' });
    this.cancelButton = page.getByRole('button', { name: 'キャンセル' });
    this.validationErrors = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/users/create');
  }

  async fillForm(data: UserFormData) {
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    await this.roleSelect.selectOption(data.role);

    if (data.department) {
      await this.departmentInput.fill(data.department);
    }

    if (data.isActive !== undefined) {
      if (data.isActive) {
        await this.isActiveCheckbox.check();
      } else {
        await this.isActiveCheckbox.uncheck();
      }
    }
  }

  async submit() {
    await this.submitButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async expectValidationError(field: string, message: string) {
    const fieldError = this.page.locator(`[data-field="${field}"]`).getByRole('alert');
    await expect(fieldError).toContainText(message);
  }

  async expectSuccess() {
    await expect(this.page.getByText('保存しました')).toBeVisible();
  }
}
```

## ベストプラクティス

### 1. ロケーターの遅延評価

ロケーターはコンストラクタで定義し、実際のDOM検索は使用時に行う:

```typescript
// ✅ 正しい: コンストラクタで定義
constructor(page: Page) {
  this.button = page.getByRole('button', { name: '送信' });
}

// ❌ 避ける: メソッド内で毎回定義
async clickSubmit() {
  await this.page.getByRole('button', { name: '送信' }).click();
}
```

### 2. 明確なメソッド名

ユーザーアクションを表す動詞で始める:

```typescript
// ✅ 良い例
async login(email: string, password: string) {}
async searchUser(query: string) {}
async deleteItem(id: string) {}
async expectError(message: string) {}

// ❌ 悪い例
async doLogin() {}  // 具体性がない
async user() {}     // 動詞がない
async check() {}    // 曖昧
```

### 3. Assertionメソッドの分離

検証ロジックはexpect*メソッドとして分離:

```typescript
// ✅ 良い例
async expectError(message: string) {
  await expect(this.errorMessage).toContainText(message);
}

async expectUserVisible(name: string) {
  await expect(this.page.getByText(name)).toBeVisible();
}

// テストでの使用
await loginPage.login('invalid', 'wrong');
await loginPage.expectError('認証情報が正しくありません');
```

### 4. ページ遷移の処理

ページ遷移を伴うアクションは新しいページオブジェクトを返す:

```typescript
async goToUserDetail(userId: string): Promise<UserDetailPage> {
  await this.page.getByTestId(`user-${userId}`).click();
  return new UserDetailPage(this.page);
}
```
