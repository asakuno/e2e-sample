---
description: 最小限の仕様からインタビューで詳細を収集し、厳格なTDD（Phase単位）で実装セッションを開始
allowed-tools: Read, Write, Bash, Task
argument-hint: [機能の概要や目的]
---

# 仕様インタビュー & 厳格TDD実装セッション作成

**このコマンドはPhase単位の厳格なTDDサイクル（RED → GREEN → REFACTOR）を採用します。**

各Phaseごとに以下を繰り返します：
1. RED: テスト作成 → コミット
2. GREEN: 最小限の実装 → コミット
3. REFACTOR: リファクタリング → コミット

## 入力された初期仕様
```
$ARGUMENTS
```

## フェーズ1: 要件インタビュー

上記の初期仕様を理解した上で、**AskUserQuestionTool** を使用して以下の観点から詳細をヒアリングしてください。

### インタビュー項目

@.claude/docs/interview-questions.md

## フェーズ2: 仕様書の作成

インタビュー結果を元に、以下の形式で仕様書を作成し `.claude/specs/` ディレクトリに保存してください。

@.claude/docs/spec-directory-setup.md

### 仕様書フォーマット

@.claude/docs/spec-template.md

**重要**: 実装手順はPhase単位で記載してください。
各PhaseごとにRED → GREEN → REFACTORサイクルを実行します。

**コミット戦略**: Phase単位でコミット（詳細は @.claude/docs/tdd-phase-based-commit-strategy.md 参照）

例（Backend - 架空の商品管理機能の場合）:

**Phase 1: Model層**
- Product Model（Eloquent）
- ProductFactory

**Phase 2: Repository層**
- ProductRepositoryInterface
- ProductRepository

**Phase 3: UseCase層**
- CreateProductUseCase, GetProductUseCase
- CreateProductData, UpdateProductData（Laravel Data DTOs）

**Phase 4: Controller層**
- ProductController（API）
- ProductPageController（Web）
- StoreProductRequest, UpdateProductRequest

例（Frontend - 架空のユーザー管理画面の場合）:

**Phase 1: 基本UIコンポーネント**
- Button, Input, Select 等の汎用コンポーネント

**Phase 2: 機能固有コンポーネント**
- UserForm コンポーネント
- UserCard コンポーネント

**Phase 3: ページコンポーネント**
- UserList ページ
- UserDetail ページ

## フェーズ3: 計画明確化インタビュー

仕様書（DESIGN.md）が作成されたら、計画の曖昧な点を深掘りして明確化します。

**重要**: このフェーズは **planモード** で実行してください。planモードでは以下のツールが使用できます：
- Read, Edit, Write
- Grep, Glob
- TodoRead, TodoWrite
- AskUserQuestion

### 手順

1. **DESIGN.md の分析**
   - `.claude/specs/designs/DESIGN.md` を読み込む
   - 不明確な点、曖昧な記述、決定が必要な項目を特定
   - 技術仕様、UI/UX、アーキテクチャの観点で確認

2. **質問の生成**

   **AskUserQuestionTool** を使用して以下のルールで質問を生成：

   <rules>
   - 質問数: **2-4個**（曖昧さのレベルに応じて調整）
   - 各質問に **2-4個の具体的な選択肢**
   - 各選択肢には **pros/cons を簡潔に記載**
   - オープンエンドな質問は避ける
   - "Other" 選択肢は自動追加されるため含めない
   - CLAUDE.md のパターンに沿った選択肢を提示
   </rules>

   **質問例:**
   ```
   質問1: データストレージの選択
   - header: "ストレージ"
   - options:
     1. Database (MySQL)
        - pros: スケーラビリティ、トランザクション対応
        - cons: セットアップが必要、パフォーマンスオーバーヘッド
     2. File System (JSON)
        - pros: シンプル、セットアップ不要
        - cons: スケールしにくい、同時書き込み制限
   ```

3. **回答の処理**

   ユーザーの回答を受け取ったら、以下の形式で決定事項を記録：

   <output_format>
   ## 決定事項

   | 項目 | 選択内容 | 理由 | 備考 |
   |------|---------|------|------|
   | データストレージ | Database | スケーラビリティが必要 | マイグレーション戦略を検討 |
   | 認証方式 | Laravel Sanctum | SPA認証に適している | CSRF対策を実装 |

   ## 次のステップ

   1. **DESIGN.md の更新**
      - 決定事項を反映
      - 曖昧だった部分を具体化

   2. **実装準備**
      - 更新された計画に基づいて実装開始
   </output_format>

4. **DESIGN.md の更新**

   決定事項を DESIGN.md に反映：
   - アーキテクチャ決定記録（ADR）セクションに追加
   - 実装手順を具体化
   - 技術スタックの詳細を明記

5. **確認とフィードバック**

   更新後、以下を確認：
   - すべての曖昧な点が解決されたか
   - 追加の質問が必要か
   - 実装開始の準備が整ったか

### 重要な注意事項

- **AskUserQuestion ツールを必ず使用** - 会話形式の質問ではなく構造化された質問
- **言語選択**:
  1. CLAUDE.md で言語設定を確認（例: "respond in Japanese"）
  2. 設定がない場合は日本語を使用
- 各選択肢には必ず **pros/cons を含める**
- multiSelect は控えめに使用（デフォルト: false）
- CLAUDE.md を読んでプロジェクトのパターンに沿った質問を生成

## フェーズ4: 実装セッションの準備

仕様書の保存が完了したら、**AskUserQuestionTool** を使用して以下の3択を提示してください：

- **question**: "実装方法を選択してください"
- **header**: "実装方法"
- **options**:
  1. **サブエージェントで自動実行（推奨）** - Phase 1（計画）→ ユーザーレビュー → Phase 2以降（実装）をサブエージェントが自動実行。レビューポイントあり
  2. **コンテキストをリセットして手動実行** - `/clear` でコンテキストをリセット後、プロンプトをコピー&ペーストして実行
  3. **現在のセッションで続行** - このセッションのまま手動で実装を進める

---

### オプション1: サブエージェントで自動実行（推奨）

ユーザーがオプション1を選択した場合、以下のフローを自動実行する。

#### ステップ1: 実装タイプの判定

仕様書の内容から実装タイプを判定する：
- **Frontend**: React/TypeScript コンポーネント、ページ実装
- **Backend**: Laravel PHP 実装（Model, Repository, UseCase, Controller）
- **Fullstack**: Backend → Frontend の順で両方実装

#### ステップ2: Phase 1 - 計画サブエージェント実行

**Taskツール** で計画エージェントを起動する。仕様書の全内容をReadツールで読み込み、プロンプトに含めること。

**Frontend の場合:**
```
Taskツール（subagent_type: plan-reviewer）
プロンプト:
  以下の仕様書に基づいて実装計画を作成してください。

  ## 仕様書
  [Readツールで .claude/specs/designs/DESIGN.md を読み込んだ全内容をここに貼り付ける]

  ## TDDコミット戦略
  @.claude/docs/tdd-phase-based-commit-strategy.md を参照し、Phase単位のTDDサイクル（RED → GREEN → REFACTOR）で計画を作成すること。

  ## 要件
  - 各PhaseでRED（テスト作成）→ GREEN（最小実装）→ REFACTOR（品質改善）を明記
  - 計画書は .claude/specs/plans/frontend/PLAN-[feature].md に出力
  - テストで使用するテストパターンは Skill('test-guidelines') を参照
```

**Backend の場合:**
```
Taskツール（subagent_type: backend-plan-reviewer）
プロンプト:
  以下の仕様書に基づいて実装計画を作成してください。

  ## 仕様書
  [Readツールで .claude/specs/designs/DESIGN.md を読み込んだ全内容をここに貼り付ける]

  ## TDDコミット戦略
  @.claude/docs/tdd-phase-based-commit-strategy.md を参照し、Phase単位のTDDサイクル（RED → GREEN → REFACTOR）で計画を作成すること。

  ## 要件
  - 7層アーキテクチャに従い、Model → Repository → UseCase → Controller の順でPhaseを構成
  - 各PhaseでRED（テスト作成）→ GREEN（最小実装）→ REFACTOR（品質改善）を明記
  - 計画書は .claude/specs/plans/backend/PLAN-[feature].md に出力
  - テストパターンは Skill('backend-test-guidelines') を参照
```

**Fullstack の場合:**
Backend → Frontend の順で計画エージェントを**逐次**起動する。
まず `backend-plan-reviewer` を実行し、完了後に `plan-reviewer` を実行する。

計画書（PLAN.md）が作成されたらコミット:
```
git commit -m "feat: Phase 1完了 - 実装計画作成"
```

#### ステップ3: ユーザーレビュー

Phase 1 の結果をユーザーに報告し、**AskUserQuestionTool** で承認を確認する：

- **question**: "Phase 1（計画）が完了しました。計画書を確認して次のアクションを選択してください"
- **header**: "計画承認"
- **options**:
  1. **承認して実装開始** - Phase 2以降のTDD実装をサブエージェントで自動実行
  2. **修正を依頼** - 計画書の修正点を指示（修正後に再度このステップに戻る）
  3. **中止** - 実装を中止してセッションを終了

**「修正を依頼」の場合**: ユーザーの指示に従い計画を修正し、再度ステップ3に戻る。
**「中止」の場合**: セッションを終了する。

#### ステップ4: Phase 2以降 - 実装サブエージェント実行（承認後）

承認を受けたら、**Taskツール** で実装エージェントを起動する。仕様書・計画書の全内容をReadツールで読み込み、プロンプトに含めること。

**Frontend の場合:**
```
Taskツール（subagent_type: implement-review）
プロンプト:
  以下の仕様書と計画書に基づいて厳格なTDD（Phase単位）で実装してください。

  ## 仕様書
  [Readツールで .claude/specs/designs/DESIGN.md を読み込んだ全内容]

  ## 計画書
  [Readツールで .claude/specs/plans/frontend/PLAN-[feature].md を読み込んだ全内容]

  ## TDDサイクル（各Phaseで実行）
  1. RED: test-review でテスト作成 → テストが失敗することを確認 → コミット: test: [Phase名] テスト作成 (RED)
  2. GREEN: implement-review でテストが通る最小限の実装 → コミット: feat: [Phase名] 実装完了 (GREEN)
  3. REFACTOR: コード品質改善（テストは引き続きパス） → コミット: refactor: [Phase名] リファクタリング (REFACTOR)

  ## 検証コマンド
  各Phase完了時: docker compose exec app yarn typecheck && docker compose exec app yarn test
```

**Backend の場合:**
```
Taskツール（subagent_type: backend-implement-review）
プロンプト:
  以下の仕様書と計画書に基づいて厳格なTDD（Phase単位）で実装してください。

  ## 仕様書
  [Readツールで .claude/specs/designs/DESIGN.md を読み込んだ全内容]

  ## 計画書
  [Readツールで .claude/specs/plans/backend/PLAN-[feature].md を読み込んだ全内容]

  ## TDDサイクル（各Phaseで実行）
  1. RED: backend-test-review でテスト作成 → テストが失敗することを確認 → コミット: test(backend): [Phase名] テスト作成 (RED)
  2. GREEN: backend-implement-review でテストが通る最小限の実装 → コミット: feat(backend): [Phase名] 実装完了 (GREEN)
  3. REFACTOR: コード品質改善（テストは引き続きパス） → コミット: refactor(backend): [Phase名] リファクタリング (REFACTOR)

  ## セキュリティ要件（Presentation層実装時）
  - FormRequestでバリデーション実装
  - Eloquent ORMまたはQuery Builderを使用（Raw SQL禁止）
  - Laravel Policyで認可チェック実装

  ## 検証コマンド
  各Phase完了時: docker compose exec app ./vendor/bin/phpunit --filter=[対象テストクラス]
```

**Fullstack の場合:**
以下の順序で**逐次**実行する：

1. **Backend実装エージェント** を起動（上記Backendプロンプト）
2. Backend完了後、**API動作確認**を実施:
   - `docker compose exec app ./vendor/bin/phpunit` で全Backendテストがパスすることを確認
   - 必要に応じて `docker compose exec app php artisan route:list` でAPIエンドポイントを確認
3. API確認後、**Frontend実装エージェント** を起動（上記Frontendプロンプト）

#### ステップ5: Phase 3 - Quality Checks

実装完了後、Quality Checks を実行する。

**Frontend:**
```bash
docker compose exec app yarn typecheck && docker compose exec app yarn check && docker compose exec app yarn test && docker compose exec app yarn build:all
```

**Backend:**
```bash
docker compose exec app ./vendor/bin/phpstan analyse && docker compose exec app ./vendor/bin/pint --test && docker compose exec app ./vendor/bin/phpunit && docker compose exec app ./vendor/bin/deptrac
```

すべてのチェックがパスするまで修正を繰り返す。
パス後にコミット: `chore: Quality Checks通過`

#### ステップ6: 完了報告

すべての Phase が完了したら、ユーザーに以下を報告：
- 実装した Phase の一覧とコミット履歴
- Quality Checks の結果
- 次のアクション（PR作成、ブラウザ確認など）の提案

---

### オプション2: コンテキストをリセットして手動実行

`/clear` でコンテキストをリセットした後、実装タイプに応じて以下のプロンプトで実装を開始してください。

TDDサイクルの詳細は @.claude/docs/tdd-phase-based-commit-strategy.md を参照。

**Frontend実装の場合:**
```
@.claude/specs/designs/DESIGN.md
@.claude/docs/tdd-phase-based-commit-strategy.md

この仕様書に基づいて厳格なTDD（Phase単位: RED → GREEN → REFACTOR）で実装してください。

1. plan-reviewer で実装計画を作成 → コミット
2. 各PhaseでTDDサイクル実行（RED → GREEN → REFACTOR、各ステップでコミット）
3. Quality Checks: docker compose exec app yarn typecheck && docker compose exec app yarn check && docker compose exec app yarn test && docker compose exec app yarn build:all
```

**Backend実装の場合:**
```
@.claude/specs/designs/DESIGN.md
@.claude/docs/tdd-phase-based-commit-strategy.md

この仕様書に基づいて厳格なTDD（Phase単位: RED → GREEN → REFACTOR）で実装してください。

1. backend-plan-reviewer で実装計画を作成 → コミット
2. 各PhaseでTDDサイクル実行（RED → GREEN → REFACTOR、各ステップでコミット）
3. Quality Checks: docker compose exec app ./vendor/bin/phpstan analyse && docker compose exec app ./vendor/bin/pint --test && docker compose exec app ./vendor/bin/phpunit && docker compose exec app ./vendor/bin/deptrac
```

**Fullstack実装の場合:**
```
@.claude/specs/designs/DESIGN.md
@.claude/docs/tdd-phase-based-commit-strategy.md

この仕様書に基づいて厳格なTDD（Phase単位）で実装してください。

実行順序: Backend → API動作確認 → Frontend
各PhaseはRED → GREEN → REFACTORを厳守し、各ステップでコミット。
Backend完了後、全テストパスとAPIエンドポイント確認を経てFrontend開始。
```

---

### オプション3: 現在のセッションで続行

現在のセッションでそのまま実装を続けることもできます。
実装タイプに応じて適切なガイドラインを参照してください：

- **Frontend**: ui-design-guidelines、coding-guidelines
- **Backend**: backend-architecture-guidelines、backend-coding-guidelines

TDDサイクルの詳細は @.claude/docs/tdd-phase-based-commit-strategy.md を参照。

**重要**: 各PhaseごとにRED → GREEN → REFACTORサイクルを実行し、それぞれコミットしてください。
