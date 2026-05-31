---
name: implementing-e2e-specs
description: |
  E2Eテスト仕様書から実装計画書を生成し、Playwrightテストコードを実装する。「セレクタ調査→計画書作成→品質ゲート→実装」の6ステップワークフローで、コンテキスト蓄積による実装ブレを防ぎ品質基準を確保する。/implementing-e2e-specs で起動。Playwrightテスト実装、Page Object生成、セレクタ調査、E2Eテスト自動実装に使用。テスト仕様書設計には使用しない（→ designing-e2e-specs）。
---

## Codex Adaptation

- Claude Code固有のslash command、subagent、Task手順はそのまま実行しない。
- ワークフロー、成果物フォーマット、品質ゲート、Playwright方針をCodexの通常作業に読み替える。
- `Skill('...')` と書かれた参照は、同名のCodex skillまたは同梱referencesを必要な範囲で読む。

# Playwrightテスト実装

## References

各ステップで必要になったタイミングで必要に応じてファイル読み込みで読み込むこと。

| ファイル | 使用ステップ | 説明 |
|---------|------------|------|
| `references/selector-validation.md` | [4/6] [6/6] | セレクタ違反パターン検出と修正提案 |
| `references/context-management-guide.md` | [5/6] | テスト規模別の実装方法選択ガイド |

**条件付き参照**（他スキルのリソース）:
- セレクタ優先順位・実装計画書テンプレート: `Skill('playwright-guidelines')` — [2/6] [3/6] で参照
- Page Objectパターン・禁止パターン/正例: `Skill('playwright-guidelines')` — [3/6] [5/6] で参照
- Seed実装例: `Skill('playwright-guidelines')` の `references/examples/login-example.md` — Seed仕様書の対応実装を確認する場合に [3/6] で参照

---

## Overview

E2Eテスト仕様書からPlaywrightテストコードを6ステップで実装するワークフロー。
責務マトリクスに基づき、**E2E対象に分類された要件のみ**を実装対象とする。

**計画書出力先**: `.claude/specs/e2e/{category}/{screen}-impl-plan.md`

---

## ワークフロー

### [1/6] 仕様書読み込み・環境確認

1. 引数 `$1` から仕様書パスを取得（空の場合は `tests/e2e/specs/**/*.spec.md` をGlobで検索しユーザーに選択を促す）
2. 必要に応じてファイル読み込みで仕様書を読み込み、以下を抽出:
   - **画面情報**: 画面ID、画面名、URL、認証要否
   - **テストケース**: テストID、テスト名、前提条件、操作手順、期待結果、優先度
   - **責務マトリクス**: 要件ID、推奨層、対応テストID、委譲先（メタ情報のみ）
   - **データ要件**: テストデータ、Laravelファクトリー定義
   - **Page Object要件**: 必要なPage Object、主要要素
3. `playwright.config.ts` の存在を確認。存在しない場合はセットアップをユーザーに確認
4. 責務マトリクスに基づき、実装対象を確定:
   - **実装対象**: 推奨層がE2Eの要件、およびE2Eテストケース
   - **対象外**: Feature/Unit委譲の要件（計画書に委譲先を明記）
   - Feature/Unitの詳細手順・期待結果は読み取っても実装対象にしない

### [2/6] セレクタ調査

実際のDOM構造を確認し、具体的なセレクタ値を特定する。

1. ブラウザ検証ツールが利用可能な場合、DOM/アクセシビリティツリー/スクリーンショットで検証することを推奨
2. アプリケーション起動中の場合、`npx playwright codegen {baseURL}` でDOM構造を確認することを推奨
3. MCP不可かつアプリ未起動の場合、ソースコード解析（`resources/js/pages/` や `resources/js/components/`）でrole/labelを推定
4. 仕様書の各画面要素に対してセレクタを決定:
   - ロールベースセレクタの検討（`getByRole`）
   - ラベルセレクタの検討（`getByLabel`）
   - 代替セレクタの検討（`getByRole`/`getByLabel`/`getByPlaceholder`/`getByText`/`getByTestId` のみ。CSS/XPathセレクタは代替でも禁止）
   - TestIDは上記で特定できない場合のみ
5. セレクタ調査結果を以下の形式で記録:

| 要素名 | 推奨セレクタ | 代替セレクタ | 確認方法 | 備考 |
|--------|-------------|-------------|---------|------|
| {要素名} | `getByLabel('...')` | `getByRole('textbox')` | MCP / codegen / ソース解析 | 確認済み |

セレクタ優先順位の詳細は `Skill('playwright-guidelines')` を参照。

### [3/6] 実装計画書の生成

1. `Skill('playwright-guidelines')` を参照（実装計画書テンプレート、Page Objectパターン、セレクタ分離、フィクスチャ設計、Laravel統合）
2. Seed実装例が必要な場合は `Skill('playwright-guidelines')` の `references/examples/login-example.md` を参照（Seed仕様書例と対応）
3. `.claude/specs/e2e/{category}/` ディレクトリを作成
4. 計画書を生成（`Skill('playwright-guidelines')` のフォーマットに従う）:
   - 参照仕様書情報
   - Playwright環境情報
   - 責務マトリクス要約（E2E対象・委譲対象の一覧、委譲は参照情報のみ）
   - Page Object設計（ロケーター一覧、アクション/アサーションメソッド一覧）
   - テストコード設計（**E2E対象ケースのみ**、AAA詳細）
   - フィクスチャ設計
   - 実装手順チェックリスト・実装ルール
5. **時間経過テストの記述ルール**: 仕様書に待機時間（例: 「30秒後に自動保存」）が含まれる場合:
   - `page.waitForTimeout()` は使用禁止。代わりに状態変化を `expect(locator).toBeVisible()` 等の Web-first Assertion で検出する
   - 計画書のAAA詳細に具体的な待機対象（例: 「自動保存ステータスの出現を待つ」）を記述する

### [4/6] 品質ゲート

実装計画書の品質を検証する。**承認なしでは実装に進めない。**

#### 並列レビューの適用閾値

- テストケース数が **6件以上** の場合、並列レビューを実施
- 5件以下は単一パスのレビュー（現行相当）

#### チェック項目

- **セレクタ検証**: 具体的なセレクタ値、優先順位遵守、代替セレクタ検討。違反パターンの詳細は `references/selector-validation.md` を参照
- **セレクタ分離**: 中規模以上（Page Object 4件以上）で推奨。詳細は `Skill('playwright-guidelines')` を参照
- **テストデータ検証**: ファクトリー名だけでなくカスタム属性が明記、用途が明確、必要なステートが指定
- **AAAパターン検証**: Arrange（データ準備・ページ遷移）が具体的、Act（1つの主要操作）が明確、Assert（具体的なアサーション）が検証可能。`page.waitForTimeout()` が含まれていないこと
- **責務境界検証**: E2E対象ケースのみを実装対象にし、Feature/Unit委譲要件は計画書へ明記

#### 並列レビュー（6件以上の場合）

Codex CLIが利用可能な場合は `codex review --uncommitted` を優先し、不可の場合はCodexの通常作業でサブエージェントを3本並列起動する。

**入力**:
- 実装計画書全文
- 仕様書全文
- セレクタ表（確認方法つき）

**判定基準（例）**:
- **Critical**: セレクタ禁止パターン、E2E対象外混入、AAA破綻
- **High**: 代替セレクタ欠落、テストデータ不整合、トレーサビリティ断絶
- **Warning**: 代替案不足、冗長なwait、冗長なアサーション

**出力フォーマット**:
- `[{issueId, severity, location, issue, suggestion}]`

**Prompt テンプレート（骨子）**:

1) セレクタ＆ロケータレビュー
```
Review the implementation plan's selectors.

Inputs:
- Implementation plan
- Selector table
Reference: references/selector-validation.md

Output:
- Violations list with severity (Critical/High/Warning)
- Suggested fixes
Format: [issueId, severity, location, issue, suggestion]
```

2) テスト設計＆AAAレビュー
```
Review the implementation plan's test design.

Inputs:
- Implementation plan
- Spec document
Criteria:
- AAA pattern, one primary action per test, web-first assertions

Output:
- Improvement list (High/Medium/Low)
Format: [issueId, severity, testId, issue, suggestion]
```

3) 責務境界＆トレーサビリティレビュー
```
Review alignment between spec and implementation plan.

Inputs:
- Spec document
- Implementation plan
Criteria:
- Responsibility matrix alignment, E2E-only scope, traceability

Output:
- Checklist with pass/fail and rationale
Format: [item, status(pass/fail/needs-check), rationale]
```

品質ゲート結果をユーザーに報告し、承認して実装/計画書を修正/計画書のみ保存を選択。

### [5/6] 実装と検証

実装方法をユーザーに確認。テスト規模に応じた推奨は `references/context-management-guide.md` を参照。

#### 自動実装またはセッション継続の場合

Codexの通常作業でサブエージェントを起動し、計画書に基づいて実装:

Codexの通常作業（subagent_type: `general-purpose`）でサブエージェントを起動し、計画書の全内容をpromptに含めて実装を指示する。

**実装手順**:
1. BasePage確認・作成（`tests/e2e/pages/base/BasePage.ts`）
2. ディレクトリ作成
3. セレクタファイル生成（中規模以上で推奨）
4. Page Object生成
5. `testSetup.ts` 更新
6. テストコード生成（**E2E対象のみ**の正常系、異常系、境界値）
7. テスト実行（`npx playwright test tests/e2e/tests/{category}/{screen}.spec.ts`）
8. 完了レポート

**必須参照**: `Skill('playwright-guidelines')`（禁止パターン、BasePage テンプレート、正例/禁止例）

#### 手動実装の場合

計画書のパスと実装開始手順を表示して終了。

### [6/6] 自動修復ループ（Healer）

テスト実行で失敗が検出された場合、自動修復を試みる。**ユーザー承認後に開始。**

#### 起動条件

- [5/6] のテスト実行で1件以上の失敗が発生した場合

#### 修復ワークフロー（最大3ループ）

各ループで以下を実行:

1. **失敗分析**: エラーメッセージ、スタックトレース、スクリーンショットを解析
2. **原因分類**:
   - セレクタ不一致
   - タイミング問題
   - アサーション不一致
   - データ依存
   - アプリケーションバグ
3. **修復実行**（許可範囲内のみ）:
   - セレクタ不一致 → セレクタ更新（必要なら再調査）
   - タイミング問題 → Web-firstアサーション追加、待機条件の見直し
   - アサーション不一致 → 期待値を実アプリ状態と照合して修正
   - データ依存 → ファクトリー/フィクスチャを修正
   - アプリケーションバグ → 修復せず、ユーザーに報告（テストをskip化）
4. **再実行**: 修正後にテストを再実行
5. **ループ判定**:
   - 全テスト合格 → 修復完了、変更サマリーを出力
   - 失敗が残る → 次のループへ（最大3回）
   - 3ループ後も失敗 → 手動修正を推奨

#### ガードレール（必須）

- **ビジネスロジック変更の禁止**: セレクタ・待機・アサーション値・テストデータのみ修正可能
- **POMメソッドシグネチャ変更は原則禁止**（軽微な明確化のみ例外）
- **修正差分の明示**: 各ループで何を変更したかをdiff形式で報告
- **skip判定基準**: テストは正しいがアプリが壊れている場合はskipし理由コメントを付与

#### 計画書へのバックポート

- Healerでセレクタ/待機/アサーションを変更した場合、計画書のロケーター表・記述に反映する
- **セレクタ変更があった場合のみ** `references/selector-validation.md` に準拠した簡易再チェックを実施する
