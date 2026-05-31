# テストデータパターン（Data クラス）

E2Eテストにおける型安全なデータ管理パターン。フォーム入力やテストデータの構造化に使用する。

## 目次

- [基本パターン](#基本パターン)
- [ディレクトリ構造](#ディレクトリ構造)
- [Fixture との統合](#fixture-との統合)
- [Laravel Factory との使い分け](#laravel-factory-との使い分け)
- [ネストデータパターン](#ネストデータパターン)
- [列挙型（Enum）パターン](#列挙型enumパターン)
- [認証ドメイン実例](#認証ドメイン実例)
- [バリデーションについて](#バリデーションについて)

## 基本パターン

### Interface + Factory 関数パターン

TypeScript の `interface` と Factory 関数を組み合わせたパターンを推奨する。`class` ではなく `interface` を使用することで、軽量かつ柔軟なデータ構造を実現する。

```typescript
// pages/auth/types/AuthTypes.ts

/**
 * ログインフォーム用の認証情報
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * LoginCredentials のデフォルト値を生成する Factory 関数
 * Partial パターンで部分的な上書きを可能にする
 */
export function createLoginCredentials(
  overrides: Partial<LoginCredentials> = {}
): LoginCredentials {
  return {
    email: 'test@example.com',
    password: 'Password123!',
    ...overrides,
  };
}
```

### 使用例

```typescript
// テストでの使用
import { createLoginCredentials } from '../pages/auth/types/AuthTypes';

test('正常ログイン', async ({ loginPage }) => {
  // デフォルト値を使用
  const credentials = createLoginCredentials();
  await loginPage.login(credentials.email, credentials.password);
});

test('無効なパスワードでエラー', async ({ loginPage }) => {
  // 部分的に上書き
  const credentials = createLoginCredentials({ password: 'wrong' });
  await loginPage.login(credentials.email, credentials.password);
  await loginPage.expectError('認証情報が正しくありません');
});
```

### なぜ Interface + Factory を推奨するか

| 比較観点 | class | interface + Factory |
|---------|-------|---------------------|
| ランタイムコスト | インスタンス化が必要 | プレーンオブジェクト |
| 型推論 | △ | ✅ TypeScript に最適化 |
| テストでの柔軟性 | △ | ✅ Partial で簡単に上書き |
| シリアライズ | 追加処理が必要 | そのまま JSON 化可能 |
| 学習コスト | 高い | 低い |

[↑ 目次に戻る](#目次)

---

## ディレクトリ構造

### 型ファイルの配置場所

型定義は **Page Object と同じドメインディレクトリ内の `types/` フォルダ** に配置する。

```
tests/e2e/
├── pages/
│   ├── base/
│   │   └── BasePage.ts
│   ├── auth/                         # 認証ドメイン
│   │   ├── LoginPage.ts
│   │   ├── RegisterPage.ts
│   │   ├── types/                    # ドメイン固有の型
│   │   │   └── AuthTypes.ts
│   │   └── selectors/
│   │       ├── loginSelectors.ts
│   │       └── registerSelectors.ts
│   ├── users/                        # ユーザー管理ドメイン
│   │   ├── UserListPage.ts
│   │   ├── UserFormPage.ts
│   │   ├── types/                    # ドメイン固有の型
│   │   │   └── UserTypes.ts
│   │   └── selectors/
│   │       └── userFormSelectors.ts
│   └── components/
│       └── ...
├── types/                            # 共通型（必要時のみ）
│   └── CommonTypes.ts
├── fixtures/
│   └── testSetup.ts
└── tests/
    └── ...
```

### 配置基準

| 型の種類 | 配置場所 | 例 |
|---------|---------|-----|
| ドメイン固有の型 | `pages/{domain}/types/` | `LoginCredentials`, `UserFormData` |
| 複数ドメインで共有 | `types/` | `Pagination`, `ApiResponse` |
| Page Object 内のみ | Page Object ファイル内 | 内部でのみ使用する型 |

[↑ 目次に戻る](#目次)

---

## Fixture との統合

### Factory 関数を Fixture として提供

```typescript
// fixtures/testSetup.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/auth/LoginPage';
import {
  createLoginCredentials,
  type LoginCredentials,
} from '../pages/auth/types/AuthTypes';

type TestFixtures = {
  loginPage: LoginPage;
  defaultCredentials: LoginCredentials;
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },

  // デフォルト認証情報を Fixture として提供
  defaultCredentials: async ({}, use) => {
    await use(createLoginCredentials());
  },
});

export { expect } from '@playwright/test';
```

### テストでの使用

```typescript
// tests/auth/login.spec.ts
import { test, expect } from '../../fixtures/testSetup';
import { createLoginCredentials } from '../../pages/auth/types/AuthTypes';

test.describe('ログイン画面', () => {
  test('デフォルト認証情報でログイン', async ({
    loginPage,
    defaultCredentials,
  }) => {
    await loginPage.login(
      defaultCredentials.email,
      defaultCredentials.password
    );
    await expect(loginPage.page).toHaveURL(/dashboard/);
  });

  test('カスタム認証情報でログイン', async ({ loginPage }) => {
    const credentials = createLoginCredentials({
      email: 'admin@example.com',
      password: 'AdminPass123!',
    });
    await loginPage.login(credentials.email, credentials.password);
  });
});
```

### Worker-scoped Fixture での認証情報共有

認証セットアップで使用する認証情報を Worker スコープで共有:

```typescript
// fixtures/testSetup.ts
import { test as base } from '@playwright/test';
import {
  createLoginCredentials,
  type LoginCredentials,
} from '../pages/auth/types/AuthTypes';

type WorkerFixtures = {
  workerCredentials: LoginCredentials;
};

type TestFixtures = {
  loginPage: LoginPage;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Worker スコープ: 全テストで同じ認証情報を共有
  workerCredentials: [
    async ({}, use) => {
      await use(createLoginCredentials());
    },
    { scope: 'worker' },
  ],

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

[↑ 目次に戻る](#目次)

---

## Laravel Factory との使い分け

E2E テストでは、データの用途に応じて **Laravel Factory** と **E2E Data クラス** を使い分ける。

### 使い分け基準

| 用途 | 使用するもの | 理由 |
|------|-------------|------|
| DB 永続化データ | Laravel Factory | データベースに保存するデータは Laravel 側で管理 |
| フォーム入力値 | E2E Data クラス | UI からの入力をシミュレート |
| エラーケーステスト | E2E Data クラス | 無効なデータパターンを柔軟に生成 |
| 認証情報 | E2E Data クラス | ログインフォームへの入力 |
| API レスポンスのモック | E2E Data クラス | フロントエンドテスト用 |

### 具体例

```typescript
// Laravel Factory: DB にユーザーを作成
test('ユーザー詳細表示', async ({ laravel, page }) => {
  // Laravel Factory でDBにデータ作成
  const user = await laravel.factory('User', {
    name: '山田太郎',
    email: 'yamada@example.com',
  });

  await page.goto(`/users/${user.id}`);
  await expect(page.getByText('山田太郎')).toBeVisible();
});

// E2E Data クラス: フォーム入力値
test('ユーザー新規作成', async ({ userFormPage }) => {
  // E2E Data クラスでフォーム入力値を生成
  const formData = createUserFormData({
    name: '佐藤花子',
    email: 'sato@example.com',
  });

  await userFormPage.fillForm(formData);
  await userFormPage.submit();
  await userFormPage.expectSuccess();
});
```

### 境界の明確化

```
┌─────────────────────────────────────────────────────────┐
│                     E2E テスト                          │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────┐    ┌───────────────────┐        │
│  │  E2E Data クラス   │    │  Laravel Factory  │        │
│  │  - フォーム入力    │    │  - DB データ作成  │        │
│  │  - エラーケース    │    │  - シーダー       │        │
│  │  - 認証情報        │    │  - テストデータ   │        │
│  └─────────┬─────────┘    └─────────┬─────────┘        │
│            │                        │                   │
│            ▼                        ▼                   │
│  ┌───────────────────────────────────────────────┐     │
│  │                   Browser                      │     │
│  │              (Playwright 操作)                 │     │
│  └───────────────────────────────────────────────┘     │
│                          │                              │
│                          ▼                              │
│  ┌───────────────────────────────────────────────┐     │
│  │             Laravel Application               │     │
│  │               (テスト対象)                    │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

[↑ 目次に戻る](#目次)

---

## ネストデータパターン

### 複雑なネスト構造の型定義

住所やプロフィールなど、ネストした構造を持つデータの型定義:

```typescript
// pages/users/types/UserTypes.ts

/**
 * 住所
 */
export interface Address {
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building?: string;
}

/**
 * ユーザープロフィール（住所を含むネスト構造）
 */
export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  address: Address;
}

/**
 * 住所のデフォルト値を生成
 */
export function createAddress(overrides: Partial<Address> = {}): Address {
  return {
    postalCode: '100-0001',
    prefecture: '東京都',
    city: '千代田区',
    street: '千代田1-1-1',
    ...overrides,
  };
}

/**
 * ユーザープロフィールのデフォルト値を生成
 * ネストした Factory 関数を組み合わせる
 */
export function createUserProfile(
  overrides: Partial<UserProfile> = {}
): UserProfile {
  return {
    name: '山田太郎',
    email: 'yamada@example.com',
    address: createAddress(overrides.address),
    ...overrides,
  };
}
```

### DeepPartial パターン

深いネスト構造で部分的な上書きを可能にする:

```typescript
// types/CommonTypes.ts

/**
 * 再帰的な Partial 型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

```typescript
// pages/users/types/UserTypes.ts
import type { DeepPartial } from '../../../types/CommonTypes';

export function createUserProfile(
  overrides: DeepPartial<UserProfile> = {}
): UserProfile {
  return {
    name: overrides.name ?? '山田太郎',
    email: overrides.email ?? 'yamada@example.com',
    phone: overrides.phone,
    address: {
      postalCode: overrides.address?.postalCode ?? '100-0001',
      prefecture: overrides.address?.prefecture ?? '東京都',
      city: overrides.address?.city ?? '千代田区',
      street: overrides.address?.street ?? '千代田1-1-1',
      building: overrides.address?.building,
    },
  };
}
```

### 使用例

```typescript
// テストでの使用
const profile = createUserProfile({
  name: '佐藤花子',
  address: {
    prefecture: '大阪府',  // 住所の一部のみ上書き
  },
});
// 結果: { name: '佐藤花子', email: 'yamada@example.com', address: { prefecture: '大阪府', city: '千代田区', ... } }
```

[↑ 目次に戻る](#目次)

---

## 列挙型（Enum）パターン

### セレクトボックス選択肢の型安全な管理

```typescript
// pages/users/types/UserTypes.ts

/**
 * ユーザー役割（セレクトボックス用）
 * const assertion で literal type を生成
 */
export const UserRoles = {
  admin: '管理者',
  editor: '編集者',
  viewer: '閲覧者',
} as const;

export type UserRole = keyof typeof UserRoles;

/**
 * 部署（セレクトボックス用）
 */
export const Departments = {
  sales: '営業部',
  engineering: '開発部',
  hr: '人事部',
  accounting: '経理部',
} as const;

export type Department = keyof typeof Departments;

/**
 * ユーザーフォームデータ
 */
export interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
  department: Department;
  isActive: boolean;
}

export function createUserFormData(
  overrides: Partial<UserFormData> = {}
): UserFormData {
  return {
    name: 'テストユーザー',
    email: 'test@example.com',
    role: 'viewer',
    department: 'engineering',
    isActive: true,
    ...overrides,
  };
}
```

### Page Object での使用

```typescript
// pages/users/UserFormPage.ts
import type { UserFormData } from './types/UserTypes';
import { UserRoles, Departments } from './types/UserTypes';

export class UserFormPage extends BasePage {
  // ...

  async fillForm(data: UserFormData) {
    await this.nameInput.fill(data.name);
    await this.emailInput.fill(data.email);
    // セレクトボックスは表示ラベルで選択
    await this.roleSelect.selectOption(UserRoles[data.role]);
    await this.departmentSelect.selectOption(Departments[data.department]);

    if (data.isActive) {
      await this.isActiveCheckbox.check();
    } else {
      await this.isActiveCheckbox.uncheck();
    }
  }
}
```

### Laravel Enum との対応

Laravel 側で Enum を使用している場合、TypeScript 側でも対応する型を定義:

```php
// app/Enums/UserRole.php
enum UserRole: string
{
    case Admin = 'admin';
    case Editor = 'editor';
    case Viewer = 'viewer';
}
```

```typescript
// TypeScript 側で同じキーを使用
export const UserRoles = {
  admin: '管理者',    // Laravel: UserRole::Admin
  editor: '編集者',   // Laravel: UserRole::Editor
  viewer: '閲覧者',   // Laravel: UserRole::Viewer
} as const;
```

[↑ 目次に戻る](#目次)

---

## 認証ドメイン実例

### 完全な AuthTypes.ts 実装例

```typescript
// pages/auth/types/AuthTypes.ts

/**
 * ログインフォーム用認証情報
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export function createLoginCredentials(
  overrides: Partial<LoginCredentials> = {}
): LoginCredentials {
  return {
    email: 'test@example.com',
    password: 'Password123!',
    rememberMe: false,
    ...overrides,
  };
}

/**
 * 新規登録フォーム用データ
 */
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  agreeToTerms: boolean;
}

export function createRegisterData(
  overrides: Partial<RegisterData> = {}
): RegisterData {
  const password = overrides.password ?? 'Password123!';
  return {
    name: 'テストユーザー',
    email: 'newuser@example.com',
    password,
    passwordConfirmation: overrides.passwordConfirmation ?? password,
    agreeToTerms: true,
    ...overrides,
  };
}

/**
 * パスワードリセット用データ
 */
export interface PasswordResetData {
  email: string;
  password: string;
  passwordConfirmation: string;
  token: string;
}

export function createPasswordResetData(
  overrides: Partial<PasswordResetData> = {}
): PasswordResetData {
  const password = overrides.password ?? 'NewPassword123!';
  return {
    email: 'user@example.com',
    password,
    passwordConfirmation: overrides.passwordConfirmation ?? password,
    token: 'test-reset-token',
    ...overrides,
  };
}

/**
 * 無効な認証情報パターン（エラーケーステスト用）
 */
export const InvalidCredentials = {
  emptyEmail: createLoginCredentials({ email: '' }),
  emptyPassword: createLoginCredentials({ password: '' }),
  invalidEmailFormat: createLoginCredentials({ email: 'not-an-email' }),
  wrongPassword: createLoginCredentials({ password: 'wrongpassword' }),
  unregisteredEmail: createLoginCredentials({ email: 'unknown@example.com' }),
} as const;
```

### テストでの使用

```typescript
// tests/auth/login.spec.ts
import { test, expect } from '../../fixtures/testSetup';
import {
  createLoginCredentials,
  InvalidCredentials,
} from '../../pages/auth/types/AuthTypes';

test.describe('ログイン画面', () => {
  test('正常ログイン', async ({ loginPage, page }) => {
    const credentials = createLoginCredentials();
    await loginPage.login(credentials.email, credentials.password);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('空のメールアドレスでエラー', async ({ loginPage }) => {
    const { email, password } = InvalidCredentials.emptyEmail;
    await loginPage.login(email, password);
    await loginPage.expectError('メールアドレスは必須です');
  });

  test('不正なメール形式でエラー', async ({ loginPage }) => {
    const { email, password } = InvalidCredentials.invalidEmailFormat;
    await loginPage.login(email, password);
    await loginPage.expectError('有効なメールアドレスを入力してください');
  });

  test('誤ったパスワードでエラー', async ({ loginPage }) => {
    const { email, password } = InvalidCredentials.wrongPassword;
    await loginPage.login(email, password);
    await loginPage.expectError('認証情報が正しくありません');
  });
});
```

[↑ 目次に戻る](#目次)

---

## バリデーションについて

### E2E 側ではバリデーションロジックを持たない

E2E テストのデータクラスは **バリデーションロジックを実装しない**。バリデーションは Laravel Precognition に依存する。

#### 理由

1. **DRY 原則**: バリデーションルールを Laravel と TypeScript で二重管理しない
2. **信頼性**: サーバーサイドのバリデーションが正しい情報源
3. **テストの目的**: E2E テストは「UI が正しくバリデーションエラーを表示するか」を検証する

#### エラーケーステストのアプローチ

```typescript
// ❌ 悪い例: E2E 側でバリデーション
export function createLoginCredentials(data: Partial<LoginCredentials>) {
  if (!data.email?.includes('@')) {
    throw new Error('Invalid email');  // 不要
  }
  // ...
}

// ✅ 良い例: 無効な値を入力してエラーメッセージを検証
test('不正なメール形式でエラー', async ({ loginPage }) => {
  // 意図的に無効なデータを作成
  const credentials = createLoginCredentials({ email: 'not-an-email' });

  // UI に入力
  await loginPage.login(credentials.email, credentials.password);

  // Laravel Precognition が返すエラーメッセージを検証
  await loginPage.expectError('有効なメールアドレスを入力してください');
});
```

### バリデーションテストの構造

```typescript
test.describe('バリデーションエラー', () => {
  // 各バリデーションルールに対応するテストケース
  test('必須チェック: メールアドレス未入力', async ({ loginPage }) => {
    await loginPage.login('', 'password');
    await loginPage.expectError('メールアドレスは必須です');
  });

  test('形式チェック: 不正なメール形式', async ({ loginPage }) => {
    await loginPage.login('invalid-email', 'password');
    await loginPage.expectError('有効なメールアドレスを入力してください');
  });

  test('最大文字数チェック: メールアドレス256文字超', async ({ loginPage }) => {
    const longEmail = 'a'.repeat(250) + '@test.com';
    await loginPage.login(longEmail, 'password');
    await loginPage.expectError('メールアドレスは255文字以内で入力してください');
  });
});
```

[↑ 目次に戻る](#目次)
