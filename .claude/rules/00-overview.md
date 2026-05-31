---
alwaysApply: true
---

# プロジェクト概要

本プロジェクトは Laravel + Inertia.js を採用したフルスタックアプリケーションである。

## 技術スタック

| 領域 | 技術 |
|------|------|
| **バックエンド** | Laravel 12.x (PHP 8.4+), Inertia.js |
| **フロントエンド** | React/TypeScript, Tailwind CSS, shadcn/ui |
| **フォーム** | Inertia v2.3+ 組み込み Precognition（`@inertiajs/react` の `useForm` + `withPrecognition()`） |
| **テスト** | PHPUnit (Backend), Vitest + RTL (Frontend) |
| **静的解析** | PHPStan, deptrac（依存関係） |
| **型生成** | spatie/laravel-data, spatie/laravel-typescript-transformer, fumeapp/modeltyper |

## アーキテクチャ

### バックエンド: 7層レイヤードアーキテクチャ（Laravel-native）

```
Presentation (Controllers) → Request → UseCase → Service/Repository → Model → Resource
```

ビジネスロジックは `app/` 配下にフラット配置する。

### フロントエンド: Inertia 中心アーキテクチャ

- **ページデータ**: Inertia Props（認証情報、メニュー、権限）
- **動的データ**: Inertia Partial Reloads / Deferred Props / Polling
- **フォーム**: `@inertiajs/react` の `useForm` + `withPrecognition()`
- **外部API**: axios（外部サービス連携、モバイルアプリ用のみ）

## 基本原則

### バックエンド

- 依存方向: 上位層 → 下位層の一方向のみ
- Controller は UseCase を呼び出す（ビジネスロジック禁止）
- UseCase は Repository Interface 経由でデータアクセス
- DTO は Laravel Data を使用

### フロントエンド

- コンポーネント指向で設計
- ビジネスロジックとUIを分離
- フォームは `@inertiajs/react` の `useForm` + `withPrecognition()` を使用

---

## Rules vs Skills の役割分担

### Rules（`.claude/rules/`）

**必須の規約** - すべてのコードで常に適用される

- セキュリティ規約（SQLインジェクション、XSS、CSRF対策等）
- レイヤー構造と責務
- コーディング規約
- テスト戦略

### Skills（`.claude/skills/`）

**診断・レビューワークフロー** - オンデマンドで参照

- AIが間違いやすいパターンのチェックリスト
- アーキテクチャ設計の判断基準
- セキュリティ診断ワークフロー
- バグ修正・レビュー対応の手順

**使い分け:**
- 実装時: Rules を遵守
- 計画・レビュー時: Skills を参照してチェック
