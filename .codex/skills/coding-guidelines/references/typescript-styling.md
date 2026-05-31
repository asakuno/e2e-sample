# TypeScript・スタイリング規約

## TypeScript 設定

strict モードを有効にする。`any` 型の使用は禁止し、型が不明な場合は `unknown` を使用する。

## 型定義

バックエンドから受け取るデータの型は `types/models.ts` に定義する。Laravel の Output DTO と対応させる。

```tsx
// types/models.ts
export interface Member {
    id: string;
    name: string;
    email: string;
    createdAt: string;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    managerId: string;
}
```

ページ props の型は各ページコンポーネントファイル内で定義する。共通の props 型は `types/index.d.ts` に定義する。

## 命名規則

コンポーネントは PascalCase とする（例: `MemberCard`, `CreateMemberForm`）。関数・変数は camelCase とする（例: `handleSubmit`, `memberList`）。定数は UPPER_SNAKE_CASE とする（例: `MAX_FILE_SIZE`, `API_ENDPOINT`）。型・インターフェースは PascalCase とする（例: `Member`, `ButtonProps`）。

## Tailwind CSS

スタイリングは Tailwind CSS を使用する。インラインスタイルは使用しない。カスタム CSS は最小限にし、必要な場合は `@apply` ディレクティブを使用する。

```tsx
// ✅ OK: Tailwind クラスを使用
<button className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
    送信
</button>

// ❌ NG: インラインスタイル
<button style={{ backgroundColor: 'blue', padding: '8px 16px' }}>
    送信
</button>
```

## クラス名の結合

条件付きクラス名は `clsx` または `cn` ユーティリティを使用する。

```tsx
import { cn } from '@/lib/utils';

<button
    className={cn(
        'rounded-md px-4 py-2',
        variant === 'primary' && 'bg-blue-500 text-white',
        variant === 'secondary' && 'bg-gray-200 text-gray-800',
        disabled && 'cursor-not-allowed opacity-50',
    )}
>
    {children}
</button>
```

## レスポンシブデザイン

モバイルファーストで実装する。ブレークポイントは Tailwind のデフォルト（`sm`, `md`, `lg`, `xl`, `2xl`）を使用する。
