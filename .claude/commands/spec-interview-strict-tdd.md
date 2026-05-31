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
   - `.claude/specs/DESIGN.md` を読み込む
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

仕様書の保存が完了したら、ユーザーに以下を提示してください：

---

### 仕様書が完成しました

**保存先:** `.claude/specs/[ファイル名]`

### 厳格なTDD実装を開始するには

#### オプション1: 新しいセッションで実行（推奨）

以下のコマンドをコピーして新しいセッションで実行してください：

```
/clear
```

その後、実装タイプに応じて以下のプロンプトで実装を開始：

**Frontend実装の場合（厳格TDD）**:
```
@.claude/specs/[ファイル名]

この仕様書に基づいて厳格なTDD（Phase単位）で実装を開始してください。

**Phase 1: Planning & Review**
  plan-reviewer で実装計画を作成
  → 完了後、計画ドキュメントをコミット:
    git commit -m "feat: Phase 1完了 - 実装計画作成"

**Phase 2以降: 各PhaseごとにTDDサイクルを実行**

各Phaseで以下を実行：

  **RED（テスト作成）**:
    test-review でPhase内の全テストを作成
    → コミット:
      git commit -m "test: [Phase名] テスト作成 (RED)"

  **GREEN（実装）**:
    implement-review でPhase内の全実装を完了
    → コミット:
      git commit -m "feat: [Phase名] 実装完了 (GREEN)"

  **REFACTOR（リファクタリング）**:
    implement-review でコード品質改善
    → コミット:
      git commit -m "refactor: [Phase名] リファクタリング (REFACTOR)"

例: Backend Phase 1（Model層）の場合

**作業順序**:
1. 全Modelのテストファイルを作成（RED）
   - UserTest.php を作成 → テスト失敗を確認
   - ProductTest.php を作成 → テスト失敗を確認
   - 一括コミット: `test(auth): Model層テスト作成 (RED)`

2. 全Modelを実装（GREEN）
   - User.php を実装（Eloquent Model、Casts、Scopes）→ UserTest.php がパス
   - Product.php を実装 → ProductTest.php がパス
   - 全テストがパスすることを確認
   - 一括コミット: `feat(auth): Model層実装完了 (GREEN)`

3. リファクタリング（REFACTOR）
   - Laravel Pint 適用
   - コーディング規約統一
   - 全テストが引き続きパスすることを確認
   - コミット: `refactor(auth): Model層リファクタリング (REFACTOR)`

Phase 3: Quality Checks を実行
  以下のコマンドをすべて実行し、すべてのチェックがパスすることを確認：
  ```bash
  bun run typecheck && bun run check && bun run test && bun run build
  ```

  **重要**: すべてのチェックがパスするまで次に進まない。

  **エラーが発生した場合**:
  1. エラーメッセージを確認
  2. 該当箇所を修正
  3. 再度 Quality Checks を実行
  4. すべてパスしたら修正をコミット

  **よくあるエラーと対処法**:
  - `typecheck` 失敗: 型定義の不足 → 適切な型を追加
  - `check` 失敗: Biome lint エラー → `bun run check --apply` で自動修正
  - `test` 失敗: テストケースの不足または実装のバグ → 修正して再実行
  - `build` 失敗: import エラーやビルド設定の問題 → エラーログを確認

コミットメッセージ例:
- RED: test(frontend): Button コンポーネント - テスト作成（RED）
- GREEN: feat(frontend): Button コンポーネント - 実装（GREEN）
- REFACTOR: refactor(frontend): Button コンポーネント - リファクタリング（REFACTOR）
```

**Backend実装の場合（厳格TDD）**:
```
@.claude/specs/[ファイル名]

この仕様書に基づいて厳格なTDD（Phase単位）で実装を開始してください。

**Phase 1: Planning & Review**
  backend-plan-reviewer で実装計画を作成
  → 完了後、計画ドキュメントをコミット:
    git commit -m "feat(backend): Phase 1完了 - 実装計画作成"

**Phase 2以降: 各PhaseごとにTDDサイクルを実行**

各Phaseで以下を実行：

  **RED（テスト作成）**:
    backend-test-review でPhase内の全テストを作成
    → コミット:
      git commit -m "test(backend): [Phase名] テスト作成 (RED)"

  **GREEN（実装）**:
    backend-implement-review でPhase内の全実装を完了
    → コミット:
      git commit -m "feat(backend): [Phase名] 実装完了 (GREEN)"

  **REFACTOR（リファクタリング）**:
    backend-implement-review でコード品質改善
    → コミット:
      git commit -m "refactor(backend): [Phase名] リファクタリング (REFACTOR)"

**Phase 4: Presentation層（セキュリティ重要）**

実装前に以下のセキュリティガイドラインを確認:
- @.claude/rules/security/01-injection.md（SQLインジェクション対策）
- @.claude/rules/security/02-xss.md（XSS対策）
- @.claude/rules/security/03-csrf-session.md（CSRF対策）
- @.claude/rules/security/05-access-control.md（認可制御）

実装時の必須事項:
- FormRequestでバリデーション実装
- Eloquent ORMまたはQuery Builderを使用（Raw SQL禁止）
- Laravel Policyで認可チェック実装
- レート制限の設定（例: throttle:5,1）

例: Phase 1（Model層）の場合

**作業順序**:
1. 全Modelのテストファイルを作成（RED）
   - ProductTest.php を作成 → テスト失敗を確認
   - CategoryTest.php を作成 → テスト失敗を確認
   - 一括コミット: `test(product): Model層テスト作成 (RED)`

2. 全Modelを実装（GREEN）
   - Product.php を実装（Eloquent Model）→ ProductTest.php がパス
   - Category.php を実装 → CategoryTest.php がパス
   - 全テストがパスすることを確認
   - 一括コミット: `feat(product): Model層実装完了 (GREEN)`

3. リファクタリング（REFACTOR）
   - Laravel Pint 適用
   - コーディング規約統一
   - 全テストが引き続きパスすることを確認
   - コミット: `refactor(product): Model層リファクタリング (REFACTOR)`

Phase 3: Quality Checks を実行
  以下のコマンドをすべて実行し、すべてのチェックがパスすることを確認：
  ```bash
  ./vendor/bin/phpstan analyse && ./vendor/bin/pint --test && ./vendor/bin/phpunit && ./vendor/bin/deptrac
  ```

  **重要**: すべてのチェックがパスするまで次に進まない。

  **エラーが発生した場合**:
  1. エラーメッセージを確認
  2. 該当箇所を修正
  3. 再度 Quality Checks を実行
  4. すべてパスしたら修正をコミット

  **よくあるエラーと対処法**:
  - `phpstan` 失敗: 型定義の不足、潜在的バグ → 適切な型を追加、コードを修正
  - `pint` 失敗: コーディング規約違反 → `./vendor/bin/pint` で自動修正
  - `phpunit` 失敗: テストケースの不足または実装のバグ → 修正して再実行
  - `deptrac` 失敗: 依存関係の違反 → 7層アーキテクチャに従って修正

コミットメッセージ例:
- Phase 1完了: feat(backend): Phase 1完了 - 実装計画作成
- RED: test(backend): Model層 テスト作成 (RED)
- GREEN: feat(backend): Model層 実装完了 (GREEN)
- REFACTOR: refactor(backend): Model層 リファクタリング (REFACTOR)
- Quality Checks: chore(backend): Quality Checks通過
```

**Fullstack実装の場合（厳格TDD）**:
```
@.claude/specs/[ファイル名]

この仕様書に基づいて厳格なTDD（Phase単位）で実装を開始してください。

実行順序:

【Backend（厳格TDD - Phase単位）】
1. Backend Phase 1: backend-plan-reviewer
   → コミット: feat(backend): Phase 1完了 - 実装計画作成

2. Backend Phase 2以降: 各PhaseごとにTDDサイクル
   例: Phase 2（Model層）
     - RED → コミット: test(backend): Model層 テスト作成 (RED)
     - GREEN → コミット: feat(backend): Model層 実装完了 (GREEN)
     - REFACTOR → コミット: refactor(backend): Model層 リファクタリング (REFACTOR)

   例: Phase 3（Repository層）
     - RED → コミット: test(backend): Repository層 テスト作成 (RED)
     - GREEN → コミット: feat(backend): Repository層 実装完了 (GREEN)
     - REFACTOR → コミット: refactor(backend): Repository層 リファクタリング (REFACTOR)

3. Backend Quality Checks
   → コミット: chore(backend): Quality Checks通過

**Backend Phase 3完了後（Frontend Phase 1開始前）**

API動作確認:
```bash
# Postmanまたはcurlでエンドポイントをテスト
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

確認事項:
- [ ] APIレスポンスが期待通り
- [ ] CSRFトークンが正しく発行されている
- [ ] セッションが適切に管理されている

確認完了後、Frontend Phase 1に進む。

【Frontend（厳格TDD - Phase単位）】
4. Frontend Phase 1: plan-reviewer
   → コミット: feat(frontend): Phase 1完了 - 実装計画作成

5. Frontend Phase 2以降: 各PhaseごとにTDDサイクル
   例: Phase 2（基本UIコンポーネント）
     - RED → コミット: test(frontend): 基本UIコンポーネント テスト作成 (RED)
     - GREEN → コミット: feat(frontend): 基本UIコンポーネント 実装完了 (GREEN)
     - REFACTOR → コミット: refactor(frontend): 基本UIコンポーネント リファクタリング (REFACTOR)

6. Frontend Quality Checks
   → コミット: chore(frontend): Quality Checks通過

重要: Backend完了後にFrontend開始。各PhaseはRED → GREEN → REFACTORを厳守。
```

---

#### オプション2: 現在のセッションで続行

現在のセッションでそのまま実装を続けることもできます。
実装タイプに応じて適切なガイドラインを参照してください：

- **Frontend**: ui-design-guidelines、coding-guidelines
- **Backend**: backend-architecture-guidelines、backend-coding-guidelines

**重要**: 各PhaseごとにRED → GREEN → REFACTORサイクルを実行し、それぞれコミットしてください。

---

**どちらを希望しますか？**
