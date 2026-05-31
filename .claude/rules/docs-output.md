# ドキュメント出力ルール

Claude が生成するドキュメントは `.claude/specs/` 配下に配置すること。
プロジェクトルートへの .md ファイル生成は禁止（CLAUDE.md, README.md を除く）。

| 種別 | パス |
|------|------|
| 設計書（Frontend） | `.claude/specs/designs/frontend/DESIGN-{feature}.md` |
| 設計書（Backend） | `.claude/specs/designs/backend/DESIGN-{feature}.md` |
| 全体設計書 | `.claude/specs/designs/DESIGN.md` |
| 実装計画（Frontend） | `.claude/specs/plans/frontend/PLAN-{feature}.md` |
| 実装計画（Backend） | `.claude/specs/plans/backend/PLAN-{feature}.md` |
| E2E関連 | `.claude/specs/e2e/{category}/{screen}.md` |
| タイムスタンプ仕様書 | `.claude/specs/designs/spec-{timestamp}.md` |
