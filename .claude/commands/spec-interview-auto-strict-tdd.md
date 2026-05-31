---
description: 仕様インタビュー後、厳格なTDD（Phase単位）でサブエージェント自動実装を開始
allowed-tools: Read, Write, Bash, Task
argument-hint: [機能の概要や目的]
---

# 仕様インタビュー & 厳格TDD自動実装

**このコマンドはPhase単位の厳格なTDDサイクル（RED → GREEN → REFACTOR）を採用します。**

各Phaseごとに以下を繰り返します：
1. RED: Phase内の全テスト作成 → コミット
2. GREEN: Phase内の全実装 → コミット
3. REFACTOR: リファクタリング → コミット

**コミット戦略**: Phase単位でコミット（詳細は @.claude/docs/tdd-phase-based-commit-strategy.md 参照）

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

@.claude/docs/spec-template-auto-strict-tdd.md

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

詳細な手順は `.claude/commands/spec-interview-strict-tdd.md` のフェーズ3を参照してください。

## フェーズ4: 実装方法の選択

仕様書保存後、**AskUserQuestionTool** で実装方法を確認：

**質問**: 実装をどのように進めますか？

**選択肢**:
1. **サブエージェントで自動実行** - Taskツールで独立したエージェントが実装を開始
2. **新しいセッションで手動実行** - /clear後に仕様書を参照して開始
3. **このセッションで続行** - 現在の会話内で実装を進める

## フェーズ5: 実装の実行

### 選択肢1の場合（サブエージェント）

インタビュー結果の技術スタックに基づいて、適切なagentで厳格なTDDサイクルを実行します。

#### Frontend実装の場合（React/TypeScript/Inertia.js）

**Phase 1: 計画・レビュー**

**Taskツール** を使用：
- subagent_type: "plan-reviewer"
- description: "Frontend Phase 1: 調査・計画"
- prompt: |
  以下の仕様書に基づいて、実装計画を作成してください。

  [仕様書の内容をここに展開]

  実施内容：
  - UI/UXレビュー（ui-design-guidelines準拠）
  - ハイブリッドアーキテクチャ設計（静的データはInertia Props、動的データはAPI）
  - コンポーネント設計（Page/Components/Layouts）
  - 実装計画書（DESIGN.md）の作成

  **重要**: 実装手順はPhase単位で記載してください。
  各PhaseごとにRED → GREEN → REFACTORサイクルを実行します。

  例（Frontend）:
  - **Phase 2: 基本UIコンポーネント** - Button, Input, Select 等
  - **Phase 3: 機能固有コンポーネント** - UserForm, UserCard 等
  - **Phase 4: ページコンポーネント** - UserList, UserDetail ページ

  完了したら、計画内容を報告してください。

**Phase 1完了後のGitコミット**:

Phase 1が完了したら、以下のコマンドで計画ドキュメントをコミットしてください：

```bash
git add .
git commit -m "feat(frontend): Phase 1完了 - UI/UX設計と実装計画を作成

- UI/UXレビュー実施
- ハイブリッドアーキテクチャ設計
- コンポーネント設計
- 実装計画書（DESIGN.md）作成
- Phase単位の実装ステップ定義

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Phase 2以降: 各PhaseごとにTDDサイクルを実行**（Phase 1完了後に実行）

**Taskツール** を使用：
- subagent_type: "implement-review"
- description: "Frontend Phase 2以降: 厳格TDD実装（Phase単位）"
- prompt: |
  Phase 1で作成した実装計画書（@DESIGN.md）に基づいて、厳格なTDDサイクルで実装してください。

  **重要**: 各PhaseごとにRED → GREEN → REFACTORサイクルを実行し、それぞれコミットしてください。

  実装手順：
  1. DESIGN.mdの「実装手順」からPhaseリストを確認
  2. 各Phaseについて以下のサイクルを実行：

    **RED（テスト作成）**:
    - Phase内の全コンポーネントのVitest/RTLテストを作成
    - Storybook ストーリー作成（条件分岐・複雑なUIの場合）
    - テストが失敗することを確認（RED）
    - コミット:
      ```
      git add .
      git commit -m "test(frontend): [Phase名] テスト作成 (RED)

      - [Phase内のコンポーネント名] Vitest/RTL テスト作成
      - [具体的なテスト内容]

      Generated with [Claude Code](https://claude.com/claude-code)

      Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
      ```

    **GREEN（実装）**:
    - Phase内の全コンポーネントを実装
    - Laravel Precognition フォーム実装（必要な場合）
    - テストが成功することを確認（GREEN）
    - コミット:
      ```
      git add .
      git commit -m "feat(frontend): [Phase名] 実装完了 (GREEN)

      - [Phase内のコンポーネント名] 実装完了
      - [具体的な実装内容]
      - テスト通過確認

      Generated with [Claude Code](https://claude.com/claude-code)

      Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
      ```

    **REFACTOR（リファクタリング）**:
    - コード品質を向上（重複削除、命名改善、最適化）
    - Serena MCP でシンボルベース編集
    - テストが引き続き成功することを確認
    - Codex MCP でコードレビュー
    - コミット:
      ```
      git add .
      git commit -m "refactor(frontend): [Phase名] リファクタリング (REFACTOR)

      - [具体的なリファクタリング内容]
      - テスト通過確認

      Generated with [Claude Code](https://claude.com/claude-code)

      Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
      ```

  3. 次のPhaseへ進む（RED → GREEN → REFACTOR を繰り返す）

  例: Phase 2（基本UIコンポーネント）の場合
    - RED: Button, Input, Select 全コンポーネントのテスト作成
    - GREEN: Button, Input, Select 全コンポーネントの実装
    - REFACTOR: コード品質改善

  完了したら、実装したPhaseリストと全テストがパスしたことを報告してください。

**Phase 3: Quality Checks**（Phase 2完了後に実行）

以下のコマンドをすべて実行し、すべてのチェックがパスすることを確認：

```bash
bun run typecheck && bun run check && bun run test && bun run build
```

**実行内容**:
- `bun run typecheck`: TypeScript型チェック
- `bun run check`: Biome lint/format チェック
- `bun run test`: Vitest テスト実行
- `bun run build`: Vite ビルド確認

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

**Phase 3完了後のGitコミット**:

Quality Checksがすべてパスしたら、以下のコマンドで修正をコミットしてください：

```bash
git add .
git commit -m "chore(frontend): Phase 3完了 - Quality Checks通過

- TypeScript型チェック通過
- Biome lint/format チェック通過
- Vitest テスト実行成功
- Vite ビルド確認完了

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**注意**: Phase 3で修正が不要だった場合（すべてのチェックが初回でパス）、このコミットは省略可能です。

---

#### Backend実装の場合（Laravel 7層アーキテクチャ）

**Phase 1: 計画・レビュー**

**Taskツール** を使用：
- subagent_type: "backend-plan-reviewer"
- description: "Backend Phase 1: 調査・計画"
- prompt: |
  以下の仕様書に基づいて、実装計画を作成してください。

  [仕様書の内容をここに展開]

  実施内容：
  - 7層アーキテクチャ設計（backend-architecture-guidelines準拠）
  - UseCase/DTO設計（Laravel Data）
  - Repository Interface設計
  - Controller設計（Web/API）
  - 実装計画書（DESIGN.md）の作成

  **重要**: 実装手順はPhase単位で記載してください。
  各PhaseごとにRED → GREEN → REFACTORサイクルを実行します。

  例（Backend）:
  - **Phase 2: Model層** - Product Model（Eloquent）、ProductFactory
  - **Phase 3: Repository層** - ProductRepositoryInterface、ProductRepository
  - **Phase 4: UseCase層** - CreateProductUseCase、GetProductUseCase、CreateProductData（Laravel Data DTOs）
  - **Phase 5: Controller層** - ProductController（API）、ProductPageController（Web）、FormRequests

  完了したら、計画内容を報告してください。

**Phase 1完了後のGitコミット**:

Phase 1が完了したら、以下のコマンドで計画ドキュメントをコミットしてください：

```bash
git add .
git commit -m "feat(backend): Phase 1完了 - 7層アーキテクチャ設計と実装計画を作成

- 7層アーキテクチャ設計（backend-architecture-guidelines準拠）
- UseCase/DTO設計（Laravel Data）
- Repository Interface設計
- Controller設計（Web/API）
- 実装計画書（DESIGN.md）作成
- Phase単位の実装ステップ定義

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Phase 2以降: 各PhaseごとにTDDサイクルを実行**（Phase 1完了後に実行）

**Taskツール** を使用：
- subagent_type: "backend-implement-review"
- description: "Backend Phase 2以降: 厳格TDD実装（Phase単位）"
- prompt: |
  Phase 1で作成した実装計画書（@DESIGN.md）に基づいて、厳格なTDDサイクルで実装してください。

  **重要**: 各PhaseごとにRED → GREEN → REFACTORサイクルを実行し、それぞれコミットしてください。

  実装手順：
  1. DESIGN.mdの「実装手順」からPhaseリストを確認
  2. 各Phaseについて以下のサイクルを実行：

    **RED（テスト作成）**:
    - Phase内の全コンポーネント（Model/UseCase/Repository等）のUnit/Featureテストを作成
    - テストが失敗することを確認（RED）
    - コミット:
      ```
      git add .
      git commit -m "test(backend): [Phase名] テスト作成 (RED)

      - [Phase内のコンポーネント名] Unit/Feature テスト作成
      - [具体的なテスト内容]

      Generated with [Claude Code](https://claude.com/claude-code)

      Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
      ```

    **GREEN（実装）**:
    - Phase内の全コンポーネントを実装
    - Model/UseCase/Repository/Controller実装
    - テストが成功することを確認（GREEN）
    - コミット:
      ```
      git add .
      git commit -m "feat(backend): [Phase名] 実装完了 (GREEN)

      - [Phase内のコンポーネント名] 実装完了
      - [具体的な実装内容]
      - テスト通過確認

      Generated with [Claude Code](https://claude.com/claude-code)

      Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
      ```

    **REFACTOR（リファクタリング）**:
    - コード品質を向上（重複削除、命名改善、最適化）
    - Laravel Pint 適用
    - Serena MCP でシンボルベース編集
    - テストが引き続き成功することを確認
    - Codex MCP でコードレビュー
    - コミット:
      ```
      git add .
      git commit -m "refactor(backend): [Phase名] リファクタリング (REFACTOR)

      - Laravel Pint 適用
      - [具体的なリファクタリング内容]
      - テスト通過確認

      Generated with [Claude Code](https://claude.com/claude-code)

      Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
      ```

  3. 次のPhaseへ進む（RED → GREEN → REFACTOR を繰り返す）

  例: Phase 2（Model層）の場合
    - RED: Product、Category 全Modelのテスト作成
    - GREEN: Product、Category 全Modelの実装（Eloquent Model）
    - REFACTOR: Pint適用、コード品質改善

  完了したら、実装したPhaseリストと全テストがパスしたことを報告してください。

**Phase 3: Quality Checks**（Phase 2完了後に実行）

以下のコマンドをすべて実行し、すべてのチェックがパスすることを確認：

```bash
./vendor/bin/phpstan analyse && \
./vendor/bin/pint --test && \
./vendor/bin/phpunit && \
./vendor/bin/deptrac
```

**実行内容**:
- `phpstan analyse`: 静的解析（型チェック、潜在的バグ検出）
- `pint --test`: コーディング規約チェック（Laravel Pint）
- `phpunit`: PHPUnit テスト実行
- `deptrac`: 依存関係チェック（7層アーキテクチャ検証）

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

**Phase 3完了後のGitコミット**:

Quality Checksがすべてパスしたら、以下のコマンドで修正をコミットしてください：

```bash
git add .
git commit -m "chore(backend): Phase 3完了 - Quality Checks通過

- PHPStan 静的解析通過
- Laravel Pint コーディング規約チェック通過
- PHPUnit テスト実行成功
- Deptrac 依存関係チェック通過

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**注意**: Phase 3で修正が不要だった場合（すべてのチェックが初回でパス）、このコミットは省略可能です。

---

#### Fullstack実装の場合（Laravel + Inertia.js）

**実行順序**: Backend（厳格TDD - Phase単位） → Frontend（厳格TDD - Phase単位）

1. **Backend Phase 1**（backend-plan-reviewer） - 計画・設計
2. **Backend Phase 2以降**（backend-implement-review） - 厳格TDDサイクル（Phase単位）
   - Phase 2（Model層）: RED → GREEN → REFACTOR
   - Phase 3（Repository層）: RED → GREEN → REFACTOR
   - Phase 4（UseCase層）: RED → GREEN → REFACTOR
   - Phase 5（Controller層）: RED → GREEN → REFACTOR
3. **Backend Quality Checks** - バックエンドの品質チェック
4. **Frontend Phase 1**（plan-reviewer） - 計画・設計
5. **Frontend Phase 2以降**（implement-review） - 厳格TDDサイクル（Phase単位）
   - Phase 2（基本UIコンポーネント）: RED → GREEN → REFACTOR
   - Phase 3（機能固有コンポーネント）: RED → GREEN → REFACTOR
   - Phase 4（ページコンポーネント）: RED → GREEN → REFACTOR
6. **Frontend Quality Checks** - フロントエンドのテスト・品質チェック

**重要事項**:
- 各フェーズは前のフェーズの完了を待ってから実行
- 各PhaseでRED → GREEN → REFACTORサイクルを厳守（Phase内の全コンポーネントをまとめて実装）
- Backend Quality Checks がパスしてから Frontend Phase 1 に進む
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
この仕様書に基づいて厳格なTDD（Phase単位）で実装を開始してください。

実装タイプに応じて適切なagentを使用：
- Frontend: /plan-reviewer → /implement-review（厳格TDD - Phase単位）
- Backend: /backend-plan-reviewer → /backend-implement-review（厳格TDD - Phase単位）

各PhaseごとにRED → GREEN → REFACTORサイクルを実行し、それぞれコミットしてください。
```
---

### 選択肢3の場合（現在のセッション）

実装タイプを確認し、適切なワークフローで実装を開始してください：

- **Frontend**: ui-design-guidelines、coding-guidelines を参照
- **Backend**: backend-architecture-guidelines、backend-coding-guidelines を参照
- **Fullstack**: Backend完了後にFrontend実装

**重要**: 各PhaseごとにRED → GREEN → REFACTORサイクルを実行し、それぞれコミットしてください。
