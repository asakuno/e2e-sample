---
description: "PRレビューコメント（markdown形式）を処理し、優先度別に分析・修正を実施。6ステップワークフロー：Parse → Present → Implement → Verify → External Review → Report。レビューループパターン対応。"
argument-hint: "<review-file-path> (例: memos/code_review.md)"
allowed-tools: ["Read", "Edit", "Write", "Grep", "Glob", "Bash", "AskUserQuestion", "TodoWrite", "Task", "Skill"]
---

# /fix-review - レビューコメント修正コマンド

PRやコードレビューで受けたフィードバック（markdown形式）を体系的に処理し、修正を実施します。

## 使い方

```
/fix-review memos/code_review.md
/fix-review                       # 対話的にファイルを選択
```

---

## 前提条件

このコマンドを実行する前に、review-fixingスキルを読み込むこと：

```
Skill('review-fixing')
```

**重要**: スキルのワークフローに従って処理を進めること。以下は概要のみ。

---

## [Step 1] レビューコメント解析

### 引数の処理

```
引数: $ARGUMENTS
- ファイルパスが指定された場合: そのファイルを使用
- 引数なしの場合: 以下の順で検索
  1. memos/*review*.md, memos/*code_review*.md
  2. docs/*review*.md
  3. ./*review*.md
```

### ファイル読み込み

Readツールでレビューファイルを読み込み、以下を分析：
- **優先度レベル**: 高（必須）、中（推奨）、低（検討）
- **カテゴリ**: セキュリティ、アーキテクチャ、コード品質、テスト、設定
- **対象ファイル**: 修正が必要なファイルパスと行番号

---

## [Step 2] ユーザーへの項目提示

### 項目選択

AskUserQuestionで修正項目を確認：

```javascript
AskUserQuestion({
  questions: [{
    question: "以下のレビューコメントを修正します。対応する項目を選択してください。",
    header: "修正項目",
    options: [
      { label: "[高] 項目1", description: "ファイル: path/to/file\n問題: 説明" },
      { label: "[中] 項目2", description: "ファイル: path/to/file\n問題: 説明" },
      { label: "[低] 項目3", description: "ファイル: path/to/file\n問題: 説明" }
    ],
    multiSelect: true
  }]
})
```

---

## [Step 3] 修正実装

### TodoWriteで進捗管理

選択された項目をTodoWriteに登録し、1つずつ修正：

1. 対象ファイルをReadで読み込み
2. Editツールで修正を適用
3. TodoWriteで完了マーク

### 実装原則

- **最小限の変更**: 指摘された問題のみ修正
- **既存スタイル維持**: プロジェクトの規約に従う
- **無関係なコードは変更しない**

---

## [Step 4] 変更検証

### フロントエンド変更時

```bash
yarn typecheck && yarn check && yarn test && yarn build
```

### バックエンド変更時

```bash
./vendor/bin/phpstan analyse && ./vendor/bin/pint --test && ./vendor/bin/phpunit
```

### 検証失敗時

- 修正に関連する失敗 → 即座に修正
- 無関係な失敗 → ユーザーに報告して判断を仰ぐ

---

## [Step 5] 外部レビュー（レビューループ）

### レビュー方法選択

1. **Codex MCP**: `mcp__codex__codex` でAIレビュー
2. **Subagent**: `implement-review` または `backend-implement-review`

### レビューループパターン

```
Implement → Verify → External Review → Issues found?
                                          ↓
                        YES → Back to Implement
                        NO  → Proceed to Report
```

### 終了条件

| 条件 | アクション |
|------|----------|
| Critical/High なし | ループ終了、Step 6へ |
| 最大3回ループ到達 | ユーザーに報告 |
| Medium以下のみ残存 | ユーザーに確認 |

---

## [Step 6] 結果レポート

```markdown
## ✅ 修正完了レポート

### 修正した項目
1. ✅ [カテゴリ] 問題タイトル
   - ファイル: path/to/file
   - 変更内容: 説明

### 検証結果
- ✅ 型チェック: パス
- ✅ Lint: パス
- ✅ テスト: パス

### 外部レビュー結果
- ✅ コードレビュー: クリーン
- 🔄 レビューループ回数: N回

### 未対応の項目
- 📝 [カテゴリ] 項目（理由）
```

---

## エラーハンドリング

### ファイルが見つからない場合

```
指定されたレビューファイルが見つかりません: [パス]

以下の場所を確認してください：
- memos/code_review.md
- docs/review.md
```

### MCP接続失敗時

Codex/Serena MCP接続失敗時は、ローカルツールにフォールバック。

---

## 参照

詳細なワークフローとパターンは以下を参照：
- `Skill('review-fixing')` - 完全なワークフロー定義
- `.claude/skills/review-fixing/references/review-patterns.md` - レビューパターン例
