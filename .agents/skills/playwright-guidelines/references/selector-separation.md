# セレクタ分離管理パターン

Page Objectからセレクタ定義を分離することで、保守性とチーム開発効率を向上させるパターン。

## 目次

- [なぜセレクタを分離するのか](#なぜセレクタを分離するのか)
- [ディレクトリ構造](#ディレクトリ構造)
- [実装パターン](#実装パターン)
- [型安全なセレクタ定義](#型安全なセレクタ定義)
- [ベストプラクティス](#ベストプラクティス)
- [導入ガイドライン](#導入ガイドライン)

---

## なぜセレクタを分離するのか

### 課題: Page Object内インラインセレクタの問題点

```typescript
// ❌ 問題のあるパターン: セレクタがPage Object内に散在
export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
    // セレクタ文字列がビジネスロジックと混在
    this.emailInput = page.getByLabel('メールアドレス');
    this.passwordInput = page.getByLabel('パスワード');
    this.signInButton = page.getByRole('button', { name: 'ログイン' });
    this.errorMessage = page.getByRole('alert');
    this.forgotPasswordLink = page.getByRole('link', { name: 'パスワードを忘れた方' });
  }
}
```

**問題点**:

| 問題 | 影響 |
|------|------|
| UIラベル変更時に複数箇所を修正 | 保守コスト増加 |
| セレクタ定義が分散 | 一覧性の欠如 |
| チームでのセレクタ再利用が困難 | 重複定義の発生 |
| セレクタ変更の影響範囲が不明確 | 回帰リスク |

### 解決策: セレクタ分離管理

セレクタ定義を専用ファイルに抽出することで:

- **単一責任**: Page Objectはアクションに集中、セレクタは別ファイルで管理
- **一覧性**: 画面ごとのセレクタを一箇所で確認可能
- **型安全性**: `as const`による型推論でタイポを防止
- **変更容易性**: UIラベル変更時にセレクタファイルのみ修正

---

## ディレクトリ構造

### ドメイン別セレクタ構造

```
tests/e2e/
├── pages/
│   ├── base/
│   │   └── BasePage.ts              # 基底クラス
│   ├── auth/                         # 認証ドメイン
│   │   ├── LoginPage.ts
│   │   ├── RegisterPage.ts
│   │   └── selectors/
│   │       ├── loginSelectors.ts     # ログイン画面セレクタ
│   │       └── registerSelectors.ts  # 登録画面セレクタ
│   ├── dashboard/                    # ダッシュボードドメイン
│   │   ├── DashboardPage.ts
│   │   └── selectors/
│   │       └── dashboardSelectors.ts
│   └── components/                   # 共通コンポーネント
│       ├── NavigationComponent.ts
│       ├── HeaderComponent.ts
│       └── selectors/
│           ├── navigationSelectors.ts
│           └── headerSelectors.ts
├── fixtures/
└── utils/
```

### 命名規則

| 種類 | 命名規則 | 例 |
|------|---------|-----|
| セレクタファイル | `{pageName}Selectors.ts` | `loginSelectors.ts` |
| セレクタオブジェクト | `{PageName}Selectors` | `LoginSelectors` |
| ドメインディレクトリ | ケバブケース禁止、キャメルケース | `auth/`, `dashboard/` |

---

## 実装パターン

### 基本パターン: セレクタオブジェクト

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
  rememberMeCheckbox: { role: 'checkbox', name: 'ログイン状態を保持' },

  // プレースホルダー（getByPlaceholder用）
  emailPlaceholder: 'example@mail.com',
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
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly rememberMeCheckbox: Locator;

  constructor(page: Page) {
    super(page);
    // セレクタオブジェクトを参照
    this.emailInput = page.getByLabel(S.emailInput);
    this.passwordInput = page.getByLabel(S.passwordInput);
    this.signInButton = page.getByRole(S.signInButton.role, { name: S.signInButton.name });
    this.errorMessage = page.getByRole(S.errorMessage.role);
    this.forgotPasswordLink = page.getByRole(
      S.forgotPasswordLink.role,
      { name: S.forgotPasswordLink.name }
    );
    this.rememberMeCheckbox = page.getByRole(
      S.rememberMeCheckbox.role,
      { name: S.rememberMeCheckbox.name }
    );
  }

  async goto() {
    await this.navigateTo('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

---

## 型安全なセレクタ定義

### `as const`による型推論

`as const`を使用することで、リテラル型として推論され、タイポを防止できる。

```typescript
// ❌ as constなし: 型が広がる
const selectors = {
  button: { role: 'button', name: 'Submit' }
};
// type: { role: string, name: string }

// ✅ as constあり: リテラル型
const selectors = {
  button: { role: 'button', name: 'Submit' }
} as const;
// type: { readonly role: "button", readonly name: "Submit" }
```

### 型定義によるセレクタ構造の統一

```typescript
// pages/types/selectorTypes.ts
export type RoleSelector = {
  readonly role: 'button' | 'link' | 'textbox' | 'checkbox' | 'alert' | 'heading' | 'menuitem' | 'navigation';
  readonly name?: string;
};

export type LabelSelector = string;
export type PlaceholderSelector = string;
export type TextSelector = string;
export type TestIdSelector = string;
```

### 高度なパターン: セレクタファクトリ

```typescript
// pages/auth/selectors/loginSelectors.ts
import type { RoleSelector } from '../../types/selectorTypes';

// ファクトリ関数で構造を統一
const role = <T extends RoleSelector['role']>(role: T, name?: string): RoleSelector => ({
  role,
  name
});

export const LoginSelectors = {
  // ラベルセレクタ
  labels: {
    email: 'メールアドレス',
    password: 'パスワード',
  },

  // ロールセレクタ
  roles: {
    signInButton: role('button', 'ログイン'),
    errorMessage: role('alert'),
    forgotPasswordLink: role('link', 'パスワードを忘れた方'),
    rememberMeCheckbox: role('checkbox', 'ログイン状態を保持'),
  },

  // プレースホルダーセレクタ
  placeholders: {
    email: 'example@mail.com',
  },
} as const;
```

---

## ベストプラクティス

### 1. セレクタ分類の一貫性

セレクタの種類ごとにグループ化することで、使用するLocatorメソッドが明確になる。

```typescript
export const UserFormSelectors = {
  // getByLabel用
  labels: {
    name: '名前',
    email: 'メールアドレス',
    department: '部署',
  },

  // getByRole用
  roles: {
    submitButton: { role: 'button', name: '保存' },
    cancelButton: { role: 'button', name: 'キャンセル' },
    roleSelect: { role: 'combobox', name: '役割' },
    isActiveCheckbox: { role: 'checkbox', name: '有効' },
  },

  // getByTestId用（最後の手段）
  testIds: {
    avatarUploader: 'avatar-upload-zone',
  },
} as const;
```

### 2. 共通セレクタの抽出

複数ページで使用するセレクタは共通ファイルに抽出。

```typescript
// pages/components/selectors/commonSelectors.ts
export const CommonSelectors = {
  roles: {
    loadingSpinner: { role: 'progressbar' },
    successMessage: { role: 'status' },
    errorMessage: { role: 'alert' },
  },
  labels: {
    submitButton: '保存',
    cancelButton: 'キャンセル',
    deleteButton: '削除',
  },
} as const;
```

### 3. セレクタ変更時の影響範囲の明確化

セレクタファイルにコメントで使用箇所を記載。

```typescript
// pages/auth/selectors/loginSelectors.ts
/**
 * ログイン画面のセレクタ定義
 *
 * 使用箇所:
 * - pages/auth/LoginPage.ts
 * - tests/auth/login.spec.ts (直接参照する場合)
 *
 * 変更時の影響:
 * - ログイン機能のE2Eテスト全体
 */
export const LoginSelectors = {
  // ...
} as const;
```

### 4. セレクタのバージョン管理

UI変更時に旧セレクタを一定期間維持する場合のパターン。

```typescript
export const LoginSelectors = {
  emailInput: 'メールアドレス',

  // v2.0.0で追加されたフィールド
  phoneInput: '電話番号',

  // 非推奨: v3.0.0で削除予定
  /** @deprecated Use emailInput instead */
  usernameInput: 'ユーザー名',
} as const;
```

---

## 導入ガイドライン

### いつセレクタ分離を導入すべきか

| 状況 | 推奨 |
|------|------|
| 小規模プロジェクト（Page Object 3件未満） | インライン維持でOK |
| 中規模プロジェクト（Page Object 3-10件） | ドメイン別分離を推奨 |
| 大規模プロジェクト（Page Object 10件以上） | 分離必須 |
| チーム開発（2名以上） | 分離を強く推奨 |
| UIの頻繁な変更が予想される | 分離必須 |

### 段階的な導入手順

1. **新規Page Objectから適用**: 既存コードは触らず、新規作成時から分離パターンを使用
2. **共通コンポーネントを優先**: NavigationComponent等の共通部品から移行
3. **ドメイン単位で移行**: 認証ドメイン、ダッシュボードドメインと順次移行
4. **レガシーコードの維持**: 既存のインラインセレクタは動作確認後に徐々に移行

### チェックリスト

- [ ] セレクタファイルは `selectors/` ディレクトリに配置
- [ ] `as const` でリテラル型を確保
- [ ] セレクタオブジェクト名は `{PageName}Selectors` 形式
- [ ] Page Objectでは `S` エイリアスでインポート
- [ ] 共通セレクタは `components/selectors/` に配置
