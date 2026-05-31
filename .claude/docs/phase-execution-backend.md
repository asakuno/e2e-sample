# Backend実装手順（Laravel 7層アーキテクチャ）

このドキュメントは、spec-interviewコマンドから参照される共通のBackend実装手順を定義します。

## Phase 1: 計画・レビュー

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

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2a: テスト作成（RED）

**Phase 1完了後に実行**

**Taskツール** を使用：
- subagent_type: "backend-test-review"
- description: "Backend Phase 2a: テスト作成（TDD）"
- prompt: |
  Phase 1で作成した実装計画書（@DESIGN.md）に基づいて、テストを先に作成してください。

  **TDD RED フェーズ**：
  - テストケースの設計
  - Unit テスト作成（UseCase層）
    - UseCaseのテスト（Repository Interfaceをモック）
  - Unit テスト作成（Model層）
    - Casts, Scopes, Accessorsのテスト
  - Feature テスト作成（Repository層/Controller層）
    - Repository実装のテスト（まだ実装されていないのでREDになる）
  - Repository Interfaceのモックを使用

  目標：
  - 期待される動作を明確にテストで定義
  - テストは失敗する状態（RED）でOK
  - テストカバレッジ計画を立てる

  完了したら、作成したテストファイルの一覧を報告してください。

**Phase 2a完了後のGitコミット**:

Phase 2aが完了したら、以下のコマンドでテストファイルをコミットしてください：

```bash
git add .
git commit -m "test(backend): Phase 2a完了 - TDD RED フェーズ テスト作成

- Unit テスト作成（UseCase層/Model層）
- Feature テスト作成（Repository層/Controller層）
- テストケース設計完了
- Repository Interface モック実装

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2b: 実装・リファクタリング（GREEN & REFACTOR）

**Phase 2a完了後に実行**

**Taskツール** を使用：
- subagent_type: "backend-implement-review"
- description: "Backend Phase 2b: 実装・リファクタリング（TDD）"
- prompt: |
  Phase 2aで作成したテストをパスする実装を行ってください。

  **TDD GREEN & REFACTOR フェーズ**：
  - Model実装（Eloquent Model）
  - Repository実装（Interface + Implementation）
  - UseCase実装（Laravel Data DTO）
  - FormRequest実装（バリデーション + DTO変換）
  - Controller実装（Web/API）
  - すべてのテストをパスさせる（GREEN）
  - コードをリファクタリング（REFACTOR）
  - Codex MCP でコードレビュー

  重要：
  - Phase 2aで作成したテストがすべてパスすることを確認
  - テストをパスさせるための最小限の実装から始める
  - リファクタリングでコード品質を向上

  完了したら、作成したファイルの一覧と全テストがパスしたことを報告してください。

**Phase 2b完了後のGitコミット**:

Phase 2bが完了したら、以下のコマンドで実装ファイルをコミットしてください：

```bash
git add .
git commit -m "feat(backend): Phase 2b完了 - TDD GREEN & REFACTOR フェーズ 実装完了

- Model実装（Eloquent Model）
- Repository実装（Interface + Implementation）
- UseCase実装（Laravel Data DTO）
- FormRequest/Controller実装
- 全テスト通過（GREEN）
- リファクタリング実施（REFACTOR）
- コードレビュー実施

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Quality Checks

**Phase 2b完了後に実行**

以下のコマンドをすべて実行し、すべてのチェックがパスすることを確認：

```bash
./vendor/bin/phpstan analyse && \
./vendor/bin/pint --test && \
./vendor/bin/phpunit && \
./vendor/bin/deptrac
```

**実行内容**:
- `./vendor/bin/phpstan analyse`: PHPStan 静的解析
- `./vendor/bin/pint --test`: Laravel Pint コーディング規約チェック
- `./vendor/bin/phpunit`: PHPUnit テスト実行
- `./vendor/bin/deptrac`: Deptrac 依存関係チェック

**重要**: すべてのチェックがパスするまで次に進まない。
エラーが発生した場合は、エラーを修正してから再度実行。

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
