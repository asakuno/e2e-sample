---
name: storybook-guidelines
description: Comprehensive Storybook story creation guidelines. Covers story structure, naming conventions, and visual testing patterns. Reference this skill when creating Storybook stories for components with conditional rendering or complex UI states during Phase 2 (Testing & Stories).
---

# Storybook Guidelines

このスキルは、Storybook ストーリー作成における標準とベストプラクティスを定義します。

## How to Use This Skill

### Quick Reference - Phase 2: Testing & Stories

**ストーリー作成時:**
- [ ] Creation Rulesで作成対象を確認（条件分岐による表示切り替えのみ）
- [ ] 実装規約を確認（Meta最小限、バレルインポート禁止）
- [ ] 詳細パターンは[story-patterns.md](references/story-patterns.md)を参照

**重要**: ビジュアルテストのため、**条件分岐による見た目の違い**にフォーカス

---

## Creation Rules

Storybook ストーリー作成時は以下のルールに従ってください：

### 作成対象

- ✅ **条件分岐による表示・非表示**: `error && <ErrorMessage />`、`isLoading && <Spinner />` など
- ✅ **条件分岐による UI 切り替え**: `user ? <UserMenu /> : <LoginButton />` など
- ✅ **データ状態による UI 変化**: 空状態、ローディング中、エラー状態など

### 作成不要

- ❌ **単純な prop 値の違い**: variant、size、color などは Control パネルで確認
- ❌ **非表示状態**: `isVisible: false` のような何も表示されない状態
- ❌ **見た目が同じストーリー**: ビジュアルの違いがないストーリーは不要
- ❌ **内部フックのモック**: コンポーネント内部の custom hook をモックしてまで作成しない

### 実装規約

- **Meta 設定は最小限**: `component` のみを指定
- **イベントハンドラーは各ストーリーの args**: `fn()` を使用し、meta には含めない
- **バレルインポート禁止**: `@/` エイリアスを使った個別インポート
- **日本語でストーリー命名**: ビジュアルの違いが一目で分かるように（例: `ErrorState`, `エラー状態`）
- **TypeScript で実装**: コメントとドキュメントは日本語

---

## Anti-patterns to Avoid

以下のアンチパターンを避けてください：

1. **内部フックのモック強要**: 内部 hook をモックしてまでストーリーを作成しない
2. **見た目が同じ重複ストーリー**: ビジュアルの違いがないストーリーは作成しない
3. **ロジック検証目的のストーリー**: ロジックは Vitest でテスト、Storybook はビジュアル確認
4. **単純な prop 値の違いで複数作成**: variant、size の違いは Control パネルで確認可能
5. **非表示状態のストーリー**: 何も表示されない状態は意味がない

---

## Story Patterns Overview

### 基本パターン

**条件分岐なしのコンポーネント**: Default ストーリー1つで十分

```typescript
export const Default: Story = {
  args: {
    onClick: fn(),
    children: "Button",
  },
};
```

### 条件分岐パターン

以下のような条件分岐がある場合、各ブランチのストーリーを作成：

| パターン | 例 | 作成するストーリー |
|---------|----|--------------------|
| **エラー状態** | `error && <ErrorMessage />` | Default, ErrorState |
| **ローディング** | `isLoading ? <Spinner /> : <Content />` | Default, Loading, NoData |
| **認証状態** | `user ? <UserMenu /> : <LoginButton />` | LoggedIn, NotLoggedIn |
| **権限分岐** | `hasPermission && <AdminPanel />` | Default, AdminView |

### 判断基準

> **「この2つのストーリーを並べて見たとき、ビジュアルの違いがハッキリ分かるか？」**

答えが **「Yes」なら作成**、**「No」なら不要** です。

詳細なコード例とパターンについては、以下のリファレンスドキュメントを参照してください。

---

## Reference Documents

詳細な実装パターンとコード例は以下のリファレンスファイルに記載されています：

| ファイル | 内容 | 参照タイミング |
|---------|------|---------------|
| [story-patterns.md](references/story-patterns.md) | 基本構造、条件分岐パターン、ローディング・認証状態、アンチパターンの詳細コード例 | ストーリー作成時、具体的な実装パターンが必要な時 |

### story-patterns.md の構成

1. **基本的なストーリーファイル構造**: 条件分岐なしのシンプルなパターン
2. **条件分岐パターン（エラー状態）**: エラーメッセージ表示・非表示の実装例
3. **ローディング状態パターン**: スピナー、空状態の実装例
4. **認証状態パターン**: ログイン・未ログイン状態の切り替え実装例
5. **避けるべきアンチパターン**: NG 例と理由の詳細説明

---

## Quick Reference

### ストーリー作成チェックリスト

ストーリーを作成する前に以下を確認：

- [ ] コンポーネントに条件分岐（`&&`, `?:`, `if`）があるか？
- [ ] その分岐により**見た目が明確に変わる**か？
- [ ] 非表示状態（何も表示されない）ではないか？
- [ ] 内部フックのモックなしで実装可能か？

すべてにチェックが入る場合のみ、ストーリーを作成してください。

---

## Summary

Storybook ストーリーは **ビジュアルテストのためのツール** です。条件分岐による見た目の違いにフォーカスし、単純な prop 値の違いや内部実装の詳細はストーリー作成の対象外です。迷った場合は「ビジュアルの違いがあるか？」を基準に判断してください。
