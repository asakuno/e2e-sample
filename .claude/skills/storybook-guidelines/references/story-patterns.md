# Storybook Story Patterns

このドキュメントは、Storybook ストーリー作成のための具体的なコードパターンと実装例を提供します。

## 目次

1. [基本的なストーリーファイル構造](#基本的なストーリーファイル構造)
2. [条件分岐パターン（エラー状態）](#条件分岐パターンエラー状態)
3. [ローディング状態パターン](#ローディング状態パターン)
4. [認証状態パターン](#認証状態パターン)
5. [避けるべきアンチパターン](#避けるべきアンチパターン)

---

## 基本的なストーリーファイル構造

### 条件分岐なしのシンプルなコンポーネント

条件分岐がないコンポーネントは、デフォルトストーリー1つで十分です。variant、size、color などの単純な prop 値の違いで複数のストーリーを作成する必要はありません。

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { Button } from "@/components/ui/button/Button";

const meta = {
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// variant、size などの単純な prop の違いでストーリーを作成しない
export const Default: Story = {
  args: {
    onClick: fn(),
    children: "Button",
  },
};
```

### ポイント

- **Meta 設定は最小限**: `component` のみを指定
- **イベントハンドラーは各ストーリーの args に配置**: `fn()` を使用
- **バレルインポート禁止**: `@/` エイリアスを使った個別インポート
- **Default ストーリーで十分**: 単純な prop 値の違いは Control パネルで確認可能

---

## 条件分岐パターン（エラー状態）

### エラーメッセージの表示・非表示

コンポーネントが `error` prop の有無で異なる UI を表示する場合、それぞれのブランチをビジュアルテストするためのストーリーを作成します。

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { FormField } from "@/components/ui/form-field/FormField";

const meta = {
  component: FormField,
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

// 正常状態（エラーなし）
export const Default: Story = {
  args: {
    label: "Username",
    value: "",
    onChange: fn(),
  },
};

// エラー状態（エラーメッセージが表示される - 条件分岐）
export const ErrorState: Story = {
  args: {
    label: "Username",
    value: "a",
    error: "Username must be at least 3 characters",
    onChange: fn(),
  },
};
```

### 対象となる条件分岐

- `error && <ErrorMessage />`
- `error ? <ErrorUI /> : <NormalUI />`
- `validationState === 'error' && <ErrorIcon />`

### ストーリー命名

- **日本語で命名**: ビジュアルの違いが一目で分かるように
- 例: `Default`, `ErrorState`, `エラー状態`, `バリデーションエラー`

---

## ローディング状態パターン

### データ取得中のスピナー表示

コンポーネントが `isLoading` prop に基づいてスピナーやローディング UI を表示する場合、各状態のストーリーを作成します。

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { DataList } from "@/components/features/data/data-list/DataList";

const meta = {
  component: DataList,
} satisfies Meta<typeof DataList>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockData = [
  { id: "1", name: "Item 1" },
  { id: "2", name: "Item 2" },
  { id: "3", name: "Item 3" },
];

// 通常表示（データあり）
export const Default: Story = {
  args: {
    data: mockData,
    onItemClick: fn(),
  },
};

// ローディング中（スピナー表示 - 条件分岐）
export const Loading: Story = {
  args: {
    data: [],
    isLoading: true,
    onItemClick: fn(),
  },
};

// データなし（空状態メッセージ表示 - 条件分岐）
export const NoData: Story = {
  args: {
    data: [],
    onItemClick: fn(),
  },
};
```

### 対象となる条件分岐

- `isLoading && <Spinner />`
- `isLoading ? <LoadingUI /> : <Content />`
- `data.length === 0 && <EmptyState />`
- `!data && <NoDataMessage />`

### 典型的なストーリーセット

1. **Default**: 通常のデータ表示状態
2. **Loading**: ローディング中のスピナー表示
3. **NoData/Empty**: データが空の場合の空状態表示

---

## 認証状態パターン

### ログイン状態による UI の切り替え

コンポーネントが `user` の有無で異なる UI を表示する場合（ログインボタン vs ユーザーメニュー）、それぞれのブランチをテストします。

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { UserMenu } from "@/components/features/header/user-menu/UserMenu";

const meta = {
  component: UserMenu,
} satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockUser = {
  id: "1",
  name: "Taro Yamada",
  avatarUrl: "https://example.com/avatar.jpg",
};

// ログイン済み（ユーザーメニュー表示）
export const LoggedIn: Story = {
  args: {
    user: mockUser,
    onLogout: fn(),
  },
};

// 未ログイン（ログインボタン表示 - 条件分岐）
export const NotLoggedIn: Story = {
  args: {
    user: null,
    onLogin: fn(),
  },
};
```

### 対象となる条件分岐

- `user ? <UserMenu /> : <LoginButton />`
- `isAuthenticated && <ProtectedContent />`
- `user === null && <GuestUI />`
- `hasPermission && <AdminPanel />`

### 典型的なストーリーセット

1. **LoggedIn**: 認証済みユーザー向け UI
2. **NotLoggedIn/Guest**: 未認証ユーザー向け UI
3. **AdminView**: 権限に基づく特殊な UI（該当する場合）

---

## 避けるべきアンチパターン

### ❌ パターン1: 単純な prop 値の違いで複数ストーリー作成

variant、size、color などの prop 値が異なるだけで、条件分岐による UI の違いがない場合は、複数のストーリーを作成する必要はありません。

```typescript
// ❌ NG: 単純な variant の違いで複数ストーリー
export const PrimaryButton: Story = {
  args: {
    variant: "primary",
    children: "Button",
  },
};

export const SecondaryButton: Story = {
  args: {
    variant: "secondary",
    children: "Button",
  },
};

export const LargeButton: Story = {
  args: {
    size: "large",
    children: "Button",
  },
};
```

**理由**: Storybook の Controls パネルで variant や size を切り替えて確認できるため、個別のストーリーは不要です。

**正しいアプローチ**: Default ストーリー1つを作成し、Controls で動的にテスト

---

### ❌ パターン2: 非表示状態のストーリー作成

`isVisible: false` のような、何も表示されない状態のストーリーは作成しません。

```typescript
// ❌ NG: 非表示状態（ビジュアルの違いがない）
export const Hidden: Story = {
  args: {
    isVisible: false,
  },
};
```

**理由**: ビジュアルテストの目的は「見た目の違い」を確認することです。非表示状態はビジュアルの違いを生まないため、ストーリーとして意味がありません。

---

### ❌ パターン3: 同じ見た目の重複ストーリー

見た目が同じになるストーリーを複数作成しません。

```typescript
// ❌ NG: 見た目が同じ重複ストーリー
export const Default1: Story = {
  args: {
    text: "Test 1",
  },
};

export const Default2: Story = {
  args: {
    text: "Test 2",
  },
};
```

**理由**: "Test 1" と "Test 2" では見た目に違いがなく、ビジュアルテストとして価値がありません。

**正しいアプローチ**: 条件分岐による見た目の違いがある場合のみストーリーを作成

---

### ❌ パターン4: 内部フックのモックを強制

コンポーネント内部で使用している custom hook をモックしてまでストーリーを作成しません。

```typescript
// ❌ NG: 内部フックをモックして無理やりストーリー作成
// このパターンは避けるべき
```

**理由**: ストーリーはコンポーネントの props を通じた外部インターフェースをテストするものです。内部実装の詳細（custom hook）をモックする必要がある場合、それはコンポーネント設計の問題の可能性があります。

**正しいアプローチ**:
- コンポーネントを props で制御可能にリファクタリング
- または、その状態は Storybook ではなく Vitest でテストする

---

### ❌ パターン5: ロジック検証目的のストーリー

ストーリーはビジュアルテストのためのものであり、ロジック検証のためではありません。

```typescript
// ❌ NG: クリック時の計算ロジックを検証したいだけのストーリー
// ロジック検証は Vitest のユニットテストで行う
```

**理由**: ロジックのテストは Vitest + React Testing Library で行います。Storybook は「見た目の違い」を確認するためのツールです。

---

## まとめ

### ストーリーを作成すべき場合

✅ **条件分岐により異なる UI が表示される場合**
- エラーメッセージの表示・非表示
- ローディング中のスピナー表示
- 空状態のメッセージ表示
- 認証状態による UI 切り替え
- 権限による UI の表示・非表示

### ストーリーを作成すべきでない場合

❌ **単純な prop 値の違い** (variant, size, color など)
❌ **非表示状態** (isVisible: false)
❌ **見た目が同じ重複ストーリー**
❌ **内部フックのモックが必要な状態**
❌ **ロジック検証が目的の場合**

### 判断基準

> **「この2つのストーリーを並べて見たとき、ビジュアルの違いがハッキリ分かるか？」**

答えが「Yes」なら作成、「No」なら不要です。
