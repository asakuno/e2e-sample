---
name: pr-creator
description: GitHub CLIを使用したプルリクエストの作成を自動化する。git diff/logから変更内容を解析し、テンプレートに沿ったPRを生成する。PRタイトルは70文字以内で具体的に、説明は概要・変更内容・テスト計画を含む構造化フォーマットで作成する。「PR作成」「プルリクエスト作成」「/pr-creator」で起動。
---

# PR Creator

GitHub CLIを使用してプルリクエストを作成する。git diff/logから変更内容を自動解析し、構造化されたPRを生成する。

## ワークフロー

### Step 1: 状態の確認

以下のコマンドを**並列実行**して現在の状態を把握する:

```bash
# 未追跡ファイルの確認
git status

# ステージ済み・未ステージの変更確認
git diff

# リモートブランチとの同期状態確認
git rev-list --left-right --count HEAD...@{upstream} 2>/dev/null || echo "No upstream"

# ベースブランチからの全コミット履歴と差分確認
git log --oneline [base-branch]...HEAD
git diff [base-branch]...HEAD
```

### Step 2: PR内容の作成

すべてのコミット（最新だけでなく全コミット）を分析し、以下を作成する:

**タイトル**:
- 70文字以内
- 具体的かつわかりやすく（「修正」ではなく何をどう変更したか）
- Conventional Commits形式を推奨: `feat:`, `fix:`, `docs:`, `refactor:` 等

**説明**:
- テンプレートに従って構造化

### Step 3: PR作成の実行

```bash
# 必要に応じてブランチ作成・プッシュ
git push -u origin HEAD

# PR作成（HEREDOCでbodyを渡す）
gh pr create --title "タイトル" --body "$(cat <<'EOF'
## 概要
<!-- このPRで何を実現するか、1-3行で説明 -->

## 関連Issue
<!-- 関連するIssue/チケットへのリンク。なければ「なし」 -->

## 変更内容
<!-- 主要な変更をリストアップ -->

## スクリーンショット
<!-- UI変更がある場合のみ。なければセクションごと削除 -->

## テスト計画
- [ ] テスト項目

## レビュアーへの注意点
<!-- 特に注意してほしい箇所、後回しにした対応、新技術の導入等。なければセクションごと削除 -->

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 4: 結果の報告

PR URLをユーザーに返す。

## PR品質チェックリスト

PRを作成する前に以下を確認する:

- [ ] タイトルが70文字以内で具体的か
- [ ] 変更に無関係なdiffを含んでいないか
- [ ] 概要がPRの目的を明確に説明しているか
- [ ] 変更内容がすべてのコミットを反映しているか
- [ ] UI変更時はスクリーンショットが含まれているか
- [ ] テスト計画が具体的か
- [ ] 機密情報（.env、credentials等）が含まれていないか

## 実行例

### 例: ドキュメント追加のPR

**入力（git log）**:
```
49ed891 docs(e2e): テストデータパターン（Interface + Factory）のドキュメント追加
97870e8 docs(e2e): playwright-guidelinesスキルのドキュメント整合性を修正
```

**生成されるPR**:
```bash
gh pr create --title "docs(e2e): Playwright E2Eテストデータパターンのドキュメント追加" --body "$(cat <<'EOF'
## 概要
E2Eテストにおける型安全なテストデータ管理パターン（Interface + Factory）のドキュメントを追加し、
playwright-guidelinesスキルのドキュメント整合性を修正。

## 変更内容
- data-patterns.md: Interface + Factory パターンの新規ドキュメント追加
- SKILL.md: テストデータパターンへの参照追加、LoginPageコード例の簡略化
- pom-patterns.md: ディレクトリ構造にtypes/フォルダを追加

## テスト計画
- [ ] SKILL.mdの参照リンクが正しく機能すること
- [ ] ドキュメント内のコード例に構文エラーがないこと

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## テンプレートのカスタマイズ

### セクションの省略ルール

| セクション | 省略条件 |
|-----------|---------|
| 関連Issue | 関連Issueがない場合 |
| スクリーンショット | UI変更がない場合 |
| レビュアーへの注意点 | 特記事項がない場合 |

### コミットタイプ別のテンプレート調整

| タイプ | 重点セクション |
|-------|--------------|
| `feat` | 概要（何を実現するか）、テスト計画 |
| `fix` | 概要（何が問題だったか、どう修正したか） |
| `docs` | 概要のみで十分、テスト計画は省略可 |
| `refactor` | 概要（なぜリファクタリングが必要か）、変更内容 |
