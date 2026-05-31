---
name: coding-guidelines
description: Comprehensive React component coding guidelines for Laravel + Inertia.js applications with Laravel Precognition and hybrid API architecture. **CRITICAL**: Focuses on patterns AI commonly fails to implement correctly, especially testability, props control, and component responsibility separation. Reference this skill when implementing or refactoring React components during Phase 2.
---

# Coding Guidelines - What AI Gets Wrong (Laravel Precognition + Hybrid API Edition)

This skill focuses on patterns AI commonly fails to implement correctly in Laravel + Inertia.js applications using Laravel Precognition for form validation and a hybrid architecture (Inertia for static content, API for dynamic data).

## How to Use This Skill

### Quick Reference - Phase 2: Implementation & Review

**実装前:**
- [ ] Critical AI Failuresセクションで注意点を確認
- [ ] 該当パターンの詳細ドキュメントを参照

**実装後:**
- [ ] AI Weakness Checklistで自己チェック
- [ ] パターンがガイドラインに一致しているか確認

## Architecture Overview

**Hybrid Approach:**
- **Static Content**: Inertia.js (server-rendered, SEO-friendly)
- **Dynamic Data**: API endpoints (real-time updates, interactive features)
- **Form Validation**: Laravel Precognition (real-time validation without full submission)

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

**AI's pattern**: Using Inertia's `useForm` or manual fetch → no real-time validation

**Correct pattern**: Use Laravel Precognition

```typescript
// ❌ AIが書くパターン: import { useForm } from '@inertiajs/react'
// ✅ 正しいパターン: import { useForm } from 'laravel-precognition-react'

const form = useForm('post', route('members.store'), { name: '', email: '' })

// Real-time validation on blur
<Input
  value={form.data.name}
  onChange={(e) => form.setData('name', e.target.value)}
  onBlur={() => form.validate('name')}
  error={form.errors.name}
/>
```

**📖 Detailed Patterns**: [form-precognition.md](references/form-precognition.md)

---

### 3. Hybrid Architecture ⚠️

**AI's pattern**: All data from Inertia OR all data from API → wrong data source

**Correct pattern**: Inertia for static, API for dynamic

```typescript
// ✅ Hybrid architecture
interface Props {
  user: User              // Static: from Inertia
  permissions: string[]   // Static: from Inertia
}

export default function Dashboard({ user, permissions }: Props) {
  // Dynamic: from API
  const { stats } = useStats()
  const { notifications } = useNotifications()

  return (
    <AuthenticatedLayout user={user}>
      <StatsCard stats={stats} />
      <NotificationList notifications={notifications} />
    </AuthenticatedLayout>
  )
}
```

**📖 Detailed Patterns**: [hybrid-architecture.md](references/hybrid-architecture.md)

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
6. **Hybrid Data Strategy** - Inertia for static, API for dynamic
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

### Laravel Precognition ⚠️
- [ ] useForm from 'laravel-precognition-react' for all forms
- [ ] onBlur validation for real-time feedback
- [ ] FormRequest with proper validation rules
- [ ] Proper error display with touched state

### Hybrid Architecture ⚠️
- [ ] Static data from Inertia props
- [ ] Dynamic data from API via custom hooks
- [ ] Clear separation of concerns
- [ ] Appropriate data source for each use case

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
1. **Uses Inertia's useForm** instead of Laravel Precognition
2. **Fetches all data from API** (should use Inertia for static)
3. **Fetches all data from Inertia** (should use API for dynamic)
4. **Mixes data fetching with presentation** (should separate)
5. **Cannot be tested** (internal state dependencies)

**Trust AI for**:
- Syntax and TypeScript basics
- Import/export statements
- Basic component structure

**Scrutinize AI for**:
- Form handling (must use Laravel Precognition)
- Data source selection (Inertia vs API)
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
| [hybrid-architecture.md](references/hybrid-architecture.md) | Inertia props vs API data strategy | ~330 |
| [props-control.md](references/props-control.md) | Making components controllable via props | ~330 |
| [conditional-branches.md](references/conditional-branches.md) | Extracting conditional branches | ~280 |
| [component-structure.md](references/component-structure.md) | Directory structure, navigation, quality | ~300 |

**Total**: ~1,850 lines of detailed patterns and examples available on-demand.
