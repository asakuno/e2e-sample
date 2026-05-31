---
name: codex-mcp-guide
description: Codex MCPの使用ガイド。コードレビュー、プランレビュー時のプロンプトテンプレート、パラメータ設定、Cursor Agent Mode時の注意事項を含む。
---

# Codex MCP 使用ガイド

## 概要

Codex MCPはAIコードレビューを提供するMCPサーバー。プランレビュー、コードレビュー、テストレビューに使用。

## 重要: Cursor Agent Mode時の注意

**Cursor AgentでCodexモデルを選択している場合、Codex MCPを使用しない。**

理由:
- 二重ラッピング（Codex→MCP→Codex）の回避
- レイテンシー改善
- コンテキスト一貫性保持

代替方法:
- `mcp__codex__codex` を呼び出さない
- 直接プロンプト: "Based on the guidelines in .claude/skills/..., please review..."
- `reasoningEffort` の代わりに "analyze deeply" や "conduct thorough analysis" を使用

## 基本パラメータ

```
mcp__codex__codex
prompt: "[レビュー内容]"
sessionId: "[task-type]-[taskName]"  # 例: "plan-review-auth-feature"
model: "gpt-5-codex"
reasoningEffort: "high" | "medium" | "low"
```

| パラメータ | 説明 |
|-----------|------|
| `sessionId` | タスク固有のセッションID。関連タスクで同じIDを使用しコンテキスト維持 |
| `model` | "gpt-5-codex" を推奨 |
| `reasoningEffort` | "high" = 詳細分析、"medium" = 再レビュー時 |

## プロンプトテンプレート

### プランレビュー（UI変更あり）

```
mcp__codex__codex
prompt: "Based on the guidelines in .claude/skills/ui-design-guidelines/ and .claude/skills/coding-guidelines/, please review the following implementation plan:

【Implementation Plan】
${implementationPlan}

【UI Design】
${uiDesign}

Review perspectives:
1. ui-design-guidelines compliance (color, typography, responsive, accessibility)
2. coding-guidelines compliance (architecture, patterns)
3. UI/UX and code implementation consistency
4. Architectural concerns
5. Improvement suggestions
6. Missing considerations"
sessionId: "plan-review-${taskName}"
model: "gpt-5-codex"
reasoningEffort: "high"
```

### プランレビュー（UI変更なし）

```
mcp__codex__codex
prompt: "Based on the guidelines in .claude/skills/coding-guidelines/, please review the following implementation plan:

【Implementation Plan】
${implementationPlan}

Review perspectives:
1. coding-guidelines compliance
2. Architectural concerns
3. Improvement suggestions
4. Missing considerations"
sessionId: "plan-review-${taskName}"
model: "gpt-5-codex"
reasoningEffort: "high"
```

### コードレビュー

```
mcp__codex__codex
prompt: "Based on the guidelines in .claude/skills/coding-guidelines/, please review the following implementation code:

【Implementation Code】
${implementedCode}

Review perspectives:
1. coding-guidelines compliance
2. Code quality, readability, maintainability
3. Best practices compliance
4. Performance concerns
5. Component responsibility separation
6. Refactoring needs"
sessionId: "code-review-${taskName}"
model: "gpt-5-codex"
reasoningEffort: "high"
```

### テストコードレビュー

```
mcp__codex__codex
prompt: "Based on the guidelines in .claude/skills/test-guidelines/ and .claude/skills/storybook-guidelines/, please review the following test code:

【Test Code】
${testCode}

Review perspectives:
1. test-guidelines compliance
2. AAA pattern adherence
3. Branch coverage completeness
4. Test naming and clarity
5. Story structure (if applicable)
6. Best practices compliance"
sessionId: "test-review-${taskName}"
model: "gpt-5-codex"
reasoningEffort: "high"
```

### 再レビュー（修正後）

```
mcp__codex__codex
prompt: "I've revised based on previous feedback. Please review again:

【Revised Content】
${revisedContent}"
sessionId: "[same-session-id]"  # 同じsessionIdでコンテキスト維持
model: "gpt-5-codex"
reasoningEffort: "medium"  # 再レビューはmediumで十分
```

## トラブルシューティング

### Codex MCPが利用不可

```bash
claude mcp list
```

設定確認: `.claude/settings.json` または `.claude/settings.local.json`

### レビューが不十分

- `reasoningEffort` を "high" に設定
- より具体的なコンテンツを提供
- 関連するガイドラインセクションを明示的に参照
