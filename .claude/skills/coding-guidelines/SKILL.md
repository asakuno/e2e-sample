---
name: coding-guidelines
description: Comprehensive React component coding guidelines for Laravel + Inertia.js applications with Inertia v2.3+ built-in Precognition and Inertia-centric architecture. **CRITICAL**: Focuses on patterns AI commonly fails to implement correctly, especially testability, props control, and component responsibility separation. Reference this skill when implementing or refactoring React components during Phase 2.
---

# Coding Guidelines - What AI Gets Wrong (Inertia v2.3+ Precognition + Inertia-Centric Edition)

## Required References

このスキルを読み込んだ後、以下のファイルをReadツールで読み込むこと。

**必須**（常に読み込む）:
- `references/testability-patterns.md` - Custom hooks + presentational components パターン
- `references/form-precognition.md` - Laravel Precognition フォーム実装パターン
- `references/inertia-centric-architecture.md` - Inertia 中心データ取得戦略

**条件付き**（該当時のみ）:
- `references/props-control.md` - コンポーネントの Props 制御パターンを実装する場合
- `references/conditional-branches.md` - 条件分岐の抽出パターンを実装する場合
- `references/component-structure.md` - ディレクトリ構造・コンポーネント設計を検討する場合
- `references/component-rules.md` - コンポーネントルールの詳細が必要な場合
- `references/typescript-styling.md` - TypeScript スタイリング規約を確認する場合
- `references/inertia-frontend.md` - Inertia フロントエンド実装の詳細が必要な場合
- `references/testing-vitest.md` - Vitest テストパターンを確認する場合

---

This skill focuses on patterns AI commonly fails to implement correctly in Laravel + Inertia.js applications using Inertia v2.3+ built-in Precognition for form validation and an Inertia-centric architecture (Inertia for all web UI data, API for external integrations only).

## How to Use This Skill

### Quick Reference - Phase 2: Implementation & Review

**実装前:**
- [ ] Critical AI Failuresセクションで注意点を確認
- [ ] 該当パターンの詳細ドキュメントを参照

**実装後:**
- [ ] AI Weakness Checklistで自己チェック
- [ ] パターンがガイドラインに一致しているか確認

## Architecture Overview

**Inertia-Centric Approach:**
- **Page Data**: Inertia Props（認証情報、メニュー、権限、SEO コンテンツ）
- **Dynamic Data**: Inertia Partial Reloads / Deferred Props / Polling
- **Form Validation**: Inertia v2.3+ `useForm` + `withPrecognition()`（リアルタイムバリデーション）
- **External API**: axios（外部サービス連携、モバイルアプリ用のみ）

---

## Critical AI Failures - Quick Reference

### 1. Lack of Testability (Most Critical) ⚠️

**AI's pattern**: Data fetching in components with internal state → untestable

**Correct pattern**: Custom hook for data + presentational component

```typescript
// ❌ AIが書くパターン: テスト不可能
function UserProfile({ userId }) {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  useEffect(() => { fetch(`/api/users/${userId}`)... }, [userId])
  if (loading) return <Spinner />
  return <div>{user.name}</div>
}

// ✅ 正しいパターン: テスト可能
function UserProfile({ user, isLoading }) {
  if (isLoading) return <Spinner />
  return <div>{user.name}</div>
}
```

**📖 Detailed Patterns**: [testability-patterns.md](references/testability-patterns.md)

---

### 2. Form Handling ⚠️

**AI's pattern**: Using `laravel-precognition-react` or manual fetch → outdated

**Correct pattern**: Use Inertia v2.3+ `useForm` + `withPrecognition()`

```typescript
// ❌ AIが書くパターン: import { useForm } from 'laravel-precognition-react'
// ✅ 正しいパターン:
import { useForm } from '@inertiajs/react';
import { store } from 'App/Http/Controllers/MemberController';

const form = useForm({ name: '', email: '' }).withPrecognition(store());

// Real-time validation on change
<Input
  value={form.data.name}
  onChange={(e) => { form.setData('name', e.target.value); form.validate('name'); }}
  error={form.errors.name}
/>
```

**📖 Detailed Patterns**: [form-precognition.md](references/form-precognition.md)

---

### 3. Inertia-Centric Architecture ⚠️

**AI's pattern**: 不要な API エンドポイントを作成 → Inertia 機能で実現可能

**Correct pattern**: Inertia Props / Partial Reloads / Deferred Props / Polling を優先

```typescript
// ✅ Inertia 中心アーキテクチャ
import { usePoll } from '@inertiajs/react';

interface Props {
  user: User                    // Inertia props
  stats?: DashboardStats        // Deferred Props（遅延ロード）
  notifications: Notification[] // Inertia props + Polling
}

export default function Dashboard({ user, stats, notifications }: Props) {
  usePoll(30000, { only: ['notifications'] });

  return (
    <AuthenticatedLayout user={user}>
      {stats ? <StatsCard stats={stats} /> : <StatsCardSkeleton />}
      <NotificationList notifications={notifications} />
    </AuthenticatedLayout>
  )
}
```

**📖 Detailed Patterns**: [inertia-centric-architecture.md](references/inertia-centric-architecture.md)

---

### 4. Insufficient Props Control ⚠️

**AI's pattern**: Components control their own state → cannot test from parent

**Correct pattern**: All states controllable via props

```typescript
// ❌ AI writes: Internal state
function Modal() {
  const [isOpen, setIsOpen] = useState(false)
  // Cannot control from parent
}

// ✅ Correct: Props controlled
function Modal({ isOpen, onClose }) {
  if (!isOpen) return null
  return <div onClick={onClose}>...</div>
}
```

**📖 Detailed Patterns**: [props-control.md](references/props-control.md)

---

### 5. Conditional Branch Extraction ⚠️

**AI's pattern**: Nested branches in one component → hard to test

**Correct pattern**: Extract each branch to separate component

```typescript
// ❌ AI writes: Nested ternaries
{user ? (loading ? <Spinner /> : (data ? <Content /> : <Empty />)) : <Login />}

// ✅ Correct: Extracted branches
if (!user) return <LoginPrompt />
return <ContentSection />

function ContentSection() {
  const { data, isLoading } = useData()
  return <Content data={data} isLoading={isLoading} />
}
```

**📖 Detailed Patterns**: [conditional-branches.md](references/conditional-branches.md)

---

## 8 Refactoring Principles

1. **Logic Extraction** - Separate data fetching into custom hooks
2. **Presenter Pattern** - Consolidate conditional text in presenter.ts
3. **Conditional UI Extraction** - Extract conditional branches to components (CRITICAL)
4. **Naming and Structure** - Use kebab-case directories, PascalCase files
5. **Props Control** - All rendering controllable via props (CRITICAL)
6. **Inertia-Centric Data Strategy** - Inertia features first, API for external only
7. **Laravel Precognition** - Real-time validation for all forms
8. **Avoid Over-Abstraction** - Don't create unnecessary wrappers

---

## Component Organization

| Category | Location | Export | Characteristics |
|----------|----------|--------|-----------------|
| **Page** | `Pages/{Module}/{Action}.tsx` | `default` | Inertia props, composition |
| **Feature** | `Components/features/{module}/` | named | Domain-specific, may use hooks |
| **UI** | `Components/ui/` | named | Pure presentational, no data fetching |
| **Hooks** | `hooks/` | named | Data fetching, business logic |
| **Layouts** | `Layouts/` | named | Wrap pages, navigation |

**📖 Detailed Guide**: [component-structure.md](references/component-structure.md)

---

## AI Weakness Checklist

Before considering implementation complete, verify AI didn't fall into these traps:

### Testability ⚠️ (Most Critical)
- [ ] Data fetching in custom hooks (not in components)
- [ ] Presentational components receive all data via props
- [ ] Each conditional branch extracted to separate component
- [ ] Easy to test each state independently

### Props Control ⚠️
- [ ] Loading states controllable from parent
- [ ] Error states controllable from parent
- [ ] All display variations controllable via props
- [ ] Custom hooks return all necessary states

### Inertia Precognition ⚠️
- [ ] useForm from '@inertiajs/react' + withPrecognition() for all forms
- [ ] validate() for real-time feedback
- [ ] FormRequest with proper validation rules on server
- [ ] Proper error display

### Inertia-Centric Architecture ⚠️
- [ ] Page data from Inertia props
- [ ] Dynamic updates via Partial Reloads / Deferred Props / Polling
- [ ] No unnecessary API endpoints for web UI data
- [ ] API only for external integrations

### Component Responsibility
- [ ] Custom hooks for data fetching
- [ ] Presentational components for display
- [ ] Page components for composition
- [ ] One responsibility per component

### Quality Requirements
- [ ] Preserve external contracts
- [ ] Run checks: `bun run check:fix && bun run typecheck`
- [ ] No new `any` types
- [ ] No new ignores (`@ts-ignore`, `// biome-ignore`)
- [ ] Resolve all warnings
- [ ] Improve type safety

---

## Summary: What to Watch For

AI will confidently write code that:
1. **Uses `laravel-precognition-react`** instead of Inertia built-in Precognition
2. **Creates unnecessary API endpoints** (should use Inertia Partial Reloads / Deferred Props / Polling)
3. **Passes all data as Inertia props without Deferred Props** (heavy data should be deferred)
4. **Mixes data fetching with presentation** (should separate)
5. **Cannot be tested** (internal state dependencies)

**Trust AI for**:
- Syntax and TypeScript basics
- Import/export statements
- Basic component structure

**Scrutinize AI for**:
- Form handling (must use Inertia `useForm` + `withPrecognition()`)
- Data source selection (Inertia features first, API only for external)
- Testability (custom hooks + presentational components)
- Props control (can parent control all states?)

**When in doubt, ask**: "Can I easily test this component's different states without mocking fetch?"

If the answer is no, extract data fetching to a custom hook and make the component purely presentational.

---

## Reference Documents

| Document | Content | Lines |
|----------|---------|-------|
| [testability-patterns.md](references/testability-patterns.md) | Custom hooks + presentational components pattern | ~280 |
| [form-precognition.md](references/form-precognition.md) | Laravel Precognition form implementation | ~330 |
| [inertia-centric-architecture.md](references/inertia-centric-architecture.md) | Inertia-centric data fetching strategy | ~330 |
| [props-control.md](references/props-control.md) | Making components controllable via props | ~330 |
| [conditional-branches.md](references/conditional-branches.md) | Extracting conditional branches | ~280 |
| [component-structure.md](references/component-structure.md) | Directory structure, navigation, quality | ~300 |

**Total**: ~1,850 lines of detailed patterns and examples available on-demand.
