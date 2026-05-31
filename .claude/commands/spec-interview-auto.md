---
description: 仕様インタビュー後、サブエージェントで自動実装を開始
allowed-tools: Read, Write, Bash, Task
argument-hint: [機能の概要や目的]
---

# 仕様インタビュー & 自動実装

## 入力された初期仕様
```
$ARGUMENTS
```

## フェーズ1: 要件インタビュー

@.claude/docs/interview-questions-auto.md

## フェーズ2: 仕様書の作成と保存

インタビュー完了後、仕様書を作成します。

1. `.claude/specs/` ディレクトリを作成（存在しない場合）:
   ```bash
   mkdir -p .claude/specs
   ```

2. 以下の形式で仕様書を作成：

@.claude/docs/spec-template-auto.md

3. ファイル名を生成：
   - タイムスタンプ: !`date +%Y%m%d-%H%M%S`
   - パス: `.claude/specs/spec-{タイムスタンプ}.md`

## フェーズ3: 計画明確化インタビュー（任意）

仕様書（DESIGN.md）が作成されたら、必要に応じて計画の曖昧な点を深掘りして明確化できます。

**重要**: このフェーズは **planモード** で実行してください。

### 手順

1. **DESIGN.md の分析**
   - 不明確な点、曖昧な記述、決定が必要な項目を特定

2. **質問の生成**
   - **AskUserQuestionTool** で2-4個の質問を生成
   - 各質問に2-4個の具体的な選択肢（pros/cons付き）

3. **DESIGN.md の更新**
   - 決定事項を反映
   - アーキテクチャ決定記録（ADR）に追加

詳細な手順は `.claude/commands/spec-interview.md` のフェーズ3を参照してください。

## フェーズ4: 実装方法の選択

仕様書保存後、**AskUserQuestionTool** で実装方法を確認：

**質問**: 実装をどのように進めますか？

**選択肢**:
1. **サブエージェントで自動実行** - Taskツールで独立したエージェントが実装を開始
2. **新しいセッションで手動実行** - /clear後に仕様書を参照して開始
3. **このセッションで続行** - 現在の会話内で実装を進める

## フェーズ5: 実装の実行

### 選択肢1の場合（サブエージェント）

インタビュー結果の技術スタックに基づいて、適切なagentを2段階で起動します。

#### Frontend実装の場合（React/TypeScript/Inertia.js）

@.claude/docs/phase-execution-frontend.md

---

#### Backend実装の場合（Laravel 7層アーキテクチャ）

@.claude/docs/phase-execution-backend.md

---

#### Fullstack実装の場合（Laravel + Inertia.js）

**実行順序**: Backend → Frontend

**1. Backend実装**:

@.claude/docs/phase-execution-backend.md

**2. Frontend実装**（Backend完了後）:

@.claude/docs/phase-execution-frontend.md

**重要事項**:
- Backend Phase 3（Quality Checks）がパスしてから Frontend Phase 1 に進む
- バックエンドAPI実装完了後、フロントエンドでそのAPIを使用

---

### 選択肢2の場合（新しいセッション）

以下のメッセージを表示：

---
**仕様書を保存しました**

新しいセッションを開始するには：

1. `/clear` を入力してセッションをクリア
2. 以下をコピーして貼り付け：

```
@.claude/specs/[保存したファイル名]
この仕様書に基づいて実装を開始してください。

実装タイプに応じて適切なagentを使用：
- Frontend: /plan-reviewer → /implement-review
- Backend: /backend-plan-reviewer → /backend-implement-review
```
---

### 選択肢3の場合（現在のセッション）

実装タイプを確認し、適切なワークフローで実装を開始してください：

- **Frontend**: ui-design-guidelines、coding-guidelines を参照
- **Backend**: backend-architecture-guidelines、backend-coding-guidelines を参照
- **Fullstack**: Backend完了後にFrontend実装
