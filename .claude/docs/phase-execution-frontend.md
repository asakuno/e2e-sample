# Frontend実装手順（React/TypeScript/Inertia.js）

このドキュメントは、spec-interviewコマンドから参照される共通のFrontend実装手順を定義します。

## Phase 1: 計画・レビュー

**Taskツール** を使用：
- subagent_type: "plan-reviewer"
- description: "Frontend Phase 1: 調査・計画"
- prompt: |
  以下の仕様書に基づいて、実装計画を作成してください。

  [仕様書の内容をここに展開]

  実施内容：
  - UI/UXレビュー実施
  - ハイブリッドアーキテクチャ設計
  - コンポーネント設計
  - 実装計画書（DESIGN.md）の作成

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

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2a: テスト作成（RED）

**Phase 1完了後に実行**

**Taskツール** を使用：
- subagent_type: "test-review"
- description: "Frontend Phase 2a: テスト作成（TDD）"
- prompt: |
  Phase 1で作成した実装計画書（@DESIGN.md）に基づいて、テストを先に作成してください。

  **TDD RED フェーズ**：
  - テストケースの設計
  - Vitest/RTL テスト作成
    - コンポーネントの振る舞いテスト（まだ実装されていないのでREDになる）
    - フォームバリデーションテスト
    - ユーザーインタラクションテスト
  - Storybook ストーリー作成（条件分岐・複雑なUIの場合）

  目標：
  - 期待される動作を明確にテストで定義
  - テストは失敗する状態（RED）でOK
  - テストカバレッジ計画を立てる

  完了したら、作成したテストファイルの一覧を報告してください。

**Phase 2a完了後のGitコミット**:

Phase 2aが完了したら、以下のコマンドでテストファイルをコミットしてください：

```bash
git add .
git commit -m "test(frontend): Phase 2a完了 - TDD RED フェーズ テスト作成

- Vitest/RTL テスト作成
- コンポーネント振る舞いテスト
- フォームバリデーションテスト
- Storybook ストーリー作成
- テストケース設計完了

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 2b: 実装・リファクタリング（GREEN & REFACTOR）

**Phase 2a完了後に実行**

**Taskツール** を使用：
- subagent_type: "implement-review"
- description: "Frontend Phase 2b: 実装・リファクタリング（TDD）"
- prompt: |
  Phase 2aで作成したテストをパスする実装を行ってください。

  **TDD GREEN & REFACTOR フェーズ**：
  - Pageコンポーネント実装
  - UIコンポーネント実装
  - Laravel Precognition フォーム実装
  - すべてのテストをパスさせる（GREEN）
  - コードをリファクタリング（REFACTOR）
  - Serena MCP でシンボルベース編集
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
git commit -m "feat(frontend): Phase 2b完了 - TDD GREEN & REFACTOR フェーズ 実装完了

- Pageコンポーネント実装
- UIコンポーネント実装
- Laravel Precognition フォーム実装
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
yarn typecheck && yarn check && yarn test && yarn build
```

**実行内容**:
- `yarn typecheck`: TypeScript型チェック
- `yarn check`: Biome lint/format チェック
- `yarn test`: Vitest テスト実行
- `yarn build`: Vite ビルド確認

**重要**: すべてのチェックがパスするまで次に進まない。
エラーが発生した場合は、エラーを修正してから再度実行。

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
