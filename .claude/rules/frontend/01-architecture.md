---
paths:
  - resources/js/**/*.tsx
  - resources/js/**/*.ts
---

# フロントエンド アーキテクチャ概要

## Inertia 中心アーキテクチャ

本プロジェクトは Inertia.js + React による Inertia 中心アーキテクチャを採用する。

| データ種別 | 取得方法 | 例 |
|-----------|---------|-----|
| **ページデータ** | Inertia Props | 認証情報、メニュー、権限、Enumオプション |
| **動的データ** | Inertia Partial Reloads / Deferred Props / Polling | 通知、統計、検索結果、リアルタイムデータ |
| **外部API** | axios | 外部サービス連携、モバイルアプリ用のみ |

## ディレクトリ構成

```
resources/js/
├── pages/          # ページコンポーネント（Inertia）
├── components/     # 再利用可能なUIコンポーネント
│   ├── ui/         # 汎用UI（Button, Input, Modal）
│   └── features/   # 機能固有コンポーネント
├── layouts/        # レイアウトコンポーネント
├── hooks/          # カスタムフック（API データ取得）
├── types/          # TypeScript型定義（generated.d.ts, model.d.ts）
├── actions/        # Wayfinder Actions（自動生成）
└── routes/         # Wayfinder Routes（自動生成）
```

## 基本原則

- **Page コンポーネント**: `export default` を使用（Inertia の慣例）
- **Components 配下**: 名前付きエクスポートを使用
- **フォーム**: `@inertiajs/react` の `useForm` + `withPrecognition()`（Inertia v2.3+ 組み込み Precognition）
- **ルーティング**: Wayfinder で型安全なURL生成
- **型定義**: すべての props に明示的な型定義

## 禁止事項

- `laravel-precognition-react` の単独使用（Inertia v2.3+ 組み込みを使用）
- ハードコードされたURL（Wayfinder を使用）
- 型定義の省略
- `any` 型の使用

---

## 詳細ガイドライン（Skills 参照）

実装時は以下の Skills を参照すること。

| 領域 | Skill |
|------|-------|
| コンポーネント実装 | `Skill('coding-guidelines')` |
| TypeScript / Tailwind CSS | `Skill('coding-guidelines')` |
| Inertia.js フロントエンド | `Skill('coding-guidelines')` |
| テスト（Vitest / RTL） | `Skill('test-guidelines')` |
| Storybook | `Skill('storybook-guidelines')` |
