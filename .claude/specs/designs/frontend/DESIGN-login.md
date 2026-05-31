# DESIGN: ログイン画面 フロントエンド実装計画

## 概要

`GET /login` で表示されるログイン画面を React/TypeScript + Inertia.js で実装する。
バックエンドは実装済み（`AuthPageController`, `LoginRequest`, `LoginUseCase`）。

## アーキテクチャ判定

- **データソース**: Inertia Props（ページレンダリング）+ Inertia `useForm`（フォーム送信）
- **API不要**: 外部連携なし、Inertia経由で `POST /login` に送信
- **UI変更あり**: 新規ページ + コンポーネント作成

## コンポーネント設計

### ファイル構成

```
resources/js/
├── layouts/
│   └── GuestLayout.tsx           # 未認証用レイアウト
├── pages/
│   └── Auth/
│       └── Login.tsx             # ログインページ（export default）
└── components/
    └── ui/
        ├── InputField.tsx        # ラベル + input + エラー表示
        ├── PasswordInput.tsx     # パスワード入力 + 表示/非表示トグル
        └── PrimaryButton.tsx     # 青色送信ボタン
```

### コンポーネント責務

| コンポーネント | 種類 | Export | 責務 |
|---------------|------|--------|------|
| `Login` | Page | default | useForm によるフォーム管理・送信、GuestLayout適用 |
| `GuestLayout` | Layout | named | 背景グレー、中央カード配置、children表示 |
| `InputField` | UI | named | label/input/error表示、aria属性、プレゼンテーショナル |
| `PasswordInput` | UI | named | InputField拡張、目アイコンで表示切替 |
| `PrimaryButton` | UI | named | 青色ボタン、disabled/processing状態対応 |

### Props設計

```typescript
// GuestLayout
interface GuestLayoutProps {
  children: React.ReactNode;
  title?: string;
}

// InputField
interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  autoComplete?: string;
  required?: boolean;
}

// PasswordInput
interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  autoComplete?: string;
  required?: boolean;
}

// PrimaryButton
interface PrimaryButtonProps {
  type?: 'button' | 'submit';
  disabled?: boolean;
  processing?: boolean;
  children: React.ReactNode;
  className?: string;
}
```

## デザイン仕様（HTMLモック準拠）

| 要素 | Tailwindクラス |
|------|---------------|
| 背景 | `bg-[#EEF2F6] min-h-screen flex items-center justify-center p-4` |
| カード | `w-full max-w-[400px] bg-white rounded-lg shadow-lg p-8 sm:p-10` |
| 見出し | `text-2xl font-bold text-gray-800 tracking-wide text-center mb-12` |
| ラベル | `block text-sm font-medium text-gray-700 mb-2` |
| 入力欄 | `w-full px-4 py-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2767cf] focus:border-transparent text-gray-600 placeholder-gray-400 shadow-sm` |
| ボタン | `w-full bg-[#2767cf] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition duration-200 shadow-md` |
| フッターリンク | `text-[13px] text-slate-600 hover:text-[#326CCB] hover:underline transition` |
| エラー文 | `text-sm text-red-600 mt-1` |
| メール欄間隔 | `mb-6` |
| パスワード欄間隔 | `mb-10` |
| フッター間隔 | `mt-6 flex justify-between items-center` |

## フォーム処理パターン

```typescript
import { useForm, Head, Link } from '@inertiajs/react';

export default function Login() {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/login');
  };
  // ...
}
```

**補足**: Inertia `useForm` の `post()` はCSRFトークンを自動送信する。バリデーションエラーは `errors` オブジェクトに自動セットされる（`errors.email`, `errors.password`）。サーバーサイドの `LoginRequest` で定義されたルールに基づくバリデーションエラーがそのまま表示される。

## アクセシビリティ要件

- セマンティックHTML: `<main>`, `<header>`, `<form>`
- すべての `<input>` に `<label>` (`htmlFor`/`id` 対応)
- エラー表示: `aria-invalid="true"`, `aria-describedby="{id}-error"`
- フォーカスリング: `focus:outline-none focus:ring-2 focus:ring-[#2767cf]`
- キーボード操作: Tab順序（email -> password -> toggle -> submit -> links）
- パスワードトグルボタン: `type="button"`, `aria-label="パスワードを表示/非表示"`
- タッチターゲット: ボタン44px以上（`py-3` = 48px相当）

## 実装手順

### Phase 1: UIコンポーネント作成

1. `resources/js/components/ui/InputField.tsx`
   - ラベル + input + エラーメッセージ表示
   - `aria-invalid`, `aria-describedby` 対応
   - エラー時のボーダー色変更（`border-red-500`）

2. `resources/js/components/ui/PasswordInput.tsx`
   - InputFieldと同等のラベル+エラー表示
   - 目アイコン（SVG）による表示/非表示トグル
   - `type` を `password` / `text` で切替
   - トグルボタンに `aria-label` 設定

3. `resources/js/components/ui/PrimaryButton.tsx`
   - `processing` 時にテキスト変更 + `disabled`
   - `disabled` 時の `opacity-50 cursor-not-allowed`

### Phase 2: レイアウト作成

4. `resources/js/layouts/GuestLayout.tsx`
   - 背景色 `#EEF2F6`、中央配置
   - 白カード（`max-w-[400px]`, `rounded-lg`, `shadow-lg`）
   - 「ログイン」見出し（`<header>` + `<h1>`）
   - `children` をカード内にレンダリング

### Phase 3: ログインページ作成

5. `resources/js/pages/Auth/Login.tsx`
   - `Head` でページタイトル設定（`<Head title="ログイン" />`）
   - `GuestLayout` でラップ
   - `useForm` で `{ email, password }` 管理
   - `form.post('/login')` で送信
   - `errors.email`, `errors.password` でエラー表示
   - 「パスワードをお忘れですか？」「新規登録はこちら」は `<Link>` or `<a>`（遷移先未定のため `href="#"` 暫定）

### Phase 4: Quality Checks

```bash
yarn typecheck    # TypeScript型チェック
yarn check        # Biome lint/format
yarn build        # Viteビルド確認
```

## 既存コードベース情報

- 既存ページ/コンポーネント: **0件**（新規プロジェクト）
- `@inertiajs/react` v2.3.6 インストール済み
- `clsx` + `cn()` ユーティリティ利用可能（`@/lib/utils`）
- パスエイリアス `@/*` = `resources/js/*` 設定済み
- SSR対応済み（`ssr.tsx`）、ページ解決パス: `./pages/${name}.tsx`
- 型定義: `@/types/index.d.ts` に `AppPageProps` 定義済み
- Tailwind CSS v4（`@import 'tailwindcss'` 形式、`@theme` ディレクティブ）
