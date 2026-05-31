# Codex Project Guide

このリポジトリで Codex が作業する時の入口となるガイドです。
Claude Code 固有の設定や command/agent は直接使わず、共通知識として `.claude/rules/` と `.claude/docs/` を参照します。

## Project

Laravel 12 + Inertia.js v2 + React 19 + TypeScript + Tailwind CSS v4 のフルスタックアプリケーションです。

主な構成:

- `app/`: Controllers, Requests, UseCases, Services, Repositories, Data, Models, Policies, Enums, Resources
- `resources/js/`: pages, components, layouts, hooks, types, generated actions/routes
- `routes/`: Web/Inertia routes and API routes
- `tests/`: PHPUnit / frontend tests

## Reference Documents

作業前に必要な範囲だけ確認してください。

- 全体方針: `.claude/rules/00-overview.md`
- バックエンド規約: `.claude/rules/backend/01-overview.md`
- フロントエンド規約: `.claude/rules/frontend/01-architecture.md`
- セキュリティ規約: `.claude/rules/security/00-overview.md`
- セキュリティチェックリスト: `.claude/rules/security/06-checklist.md`
- 詳細な開発ワークフローと品質チェック: `CLAUDE.md`
- Codex skills: `.codex/skills/` に移植済みのプロジェクト用 skills

## Working Rules

- 既存コードの構成、命名、責務分離を優先する。
- 変更は依頼範囲に絞り、無関係なリファクタリングや整形を混ぜない。
- ユーザーや他ツールの未コミット変更は戻さない。
- ドキュメントファイルは、明示的に依頼された場合だけ新規作成する。
- 依存パッケージの追加、削除、更新は、明示的な承認がある場合だけ行う。
- 実装時は sibling file を確認して、同じパターンで追加する。

## Backend

- Controller にビジネスロジックを書かない。
- Controller は Request / UseCase / Resource を中心に薄く保つ。
- UseCase はビジネスロジックを担当する。
- データアクセスは Repository Interface 経由を基本にする。
- DTO は Laravel Data の利用を優先する。
- バリデーションは Form Request に寄せる。
- テストは PHPUnit を使い、UseCase / Repository / Controller の責務に合わせて配置する。

## Frontend

- Inertia 中心のデータフローを優先する。
- ページデータは Inertia props、動的更新は Partial Reloads / Deferred Props / Polling を検討する。
- フォームは `@inertiajs/react` の `useForm` と Precognition パターンを優先する。
- UI とビジネスロジックを分離する。
- 既存コンポーネント、hooks、layouts を再利用してから新規作成を検討する。
- Tailwind CSS v4 の既存スタイル規約に合わせる。

## Commands

ローカル開発では、PHP / Composer / Node / npm / Artisan 系コマンドは原則 Docker コンテナ内で実行します。

Frontend checks:

```bash
docker compose exec app npm run typecheck
docker compose exec app npm run check
docker compose exec app npm run test:ci
docker compose exec app npm run build:all
```

Backend checks:

```bash
docker compose exec app ./vendor/bin/phpstan analyse
docker compose exec app ./vendor/bin/pint --test
docker compose exec app ./vendor/bin/phpunit
docker compose exec app ./vendor/bin/deptrac
```

必要に応じて、関連する最小範囲のチェックから実行し、最終的に影響範囲に合う品質確認を行います。

## Claude-Specific Files

以下は Claude Code 用の資産です。Codex では直接実行前提にしません。

- `.claude/settings.json`
- `.claude/agents/`
- `.claude/commands/`
- `.claude/skills/utility-codex/`

`.claude/skills/` は移植元の資料として扱います。Codex では `.codex/skills/` にある同名 skill を優先し、未移植の Claude 固有 skill は直接実行前提にしません。
