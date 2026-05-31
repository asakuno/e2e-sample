# Component Structure and Organization

## Overview

This document covers directory structure, navigation patterns, quality requirements, and best practices for organizing React components in a Laravel + Inertia.js application.

## Directory Structure

### Project Layout

```
resources/js/
├── Pages/                    # ページコンポーネント（Inertia）
│   ├── Members/
│   │   ├── Index.tsx
│   │   ├── Show.tsx
│   │   ├── Create.tsx
│   │   └── Edit.tsx
│   ├── Projects/
│   │   ├── Index.tsx
│   │   └── Show.tsx
│   └── Dashboard.tsx
├── Components/               # 再利用可能なUIコンポーネント
│   ├── ui/                   # 汎用UIコンポーネント
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   └── Spinner.tsx
│   └── features/             # 機能固有のコンポーネント
│       ├── members/
│       │   ├── MemberCard.tsx
│       │   ├── MemberForm.tsx
│       │   └── MemberList.tsx
│       └── projects/
│           ├── ProjectCard.tsx
│           └── ProjectForm.tsx
├── Layouts/                  # レイアウトコンポーネント
│   ├── AuthenticatedLayout.tsx
│   ├── GuestLayout.tsx
│   └── AdminLayout.tsx
├── hooks/                    # カスタムフック
│   ├── useMembers.ts
│   ├── useProjects.ts
│   ├── useStats.ts
│   └── useApiData.ts
├── types/                    # 型定義
│   ├── index.d.ts           # グローバル型
│   └── models.ts            # ドメインモデル型
└── lib/                      # ユーティリティ関数
    ├── utils.ts
    ├── api.ts
    └── formatters.ts
```

## Component Categories

### 1. Page Components

**Location**: `resources/js/Pages/{Module}/{Action}.tsx`

**Characteristics:**
- Receive static data from Inertia props
- Compose presentational components
- Handle page-level logic
- Use `export default` (Inertia convention)

**Example:**
```typescript
// resources/js/Pages/Members/Index.tsx
interface Props {
  members: Member[]
  pagination: Pagination
}

export default function Index({ members, pagination }: Props) {
  const { filteredMembers, search } = useSearch(members)

  return (
    <AuthenticatedLayout>
      <Head title="メンバー一覧" />
      <MemberSearchForm onSearch={search} />
      <MemberList members={filteredMembers} />
      <PaginationControls {...pagination} />
    </AuthenticatedLayout>
  )
}
```

### 2. Feature Components

**Location**: `resources/js/Components/features/{module}/`

**Characteristics:**
- Domain-specific components
- May use custom hooks for dynamic data
- Named exports
- Reusable within the feature

**Example:**
```typescript
// resources/js/Components/features/members/MemberCard.tsx
interface MemberCardProps {
  member: Member
  onEdit?: () => void
  onDelete?: () => void
}

export function MemberCard({ member, onEdit, onDelete }: MemberCardProps) {
  return (
    <Card>
      <CardHeader>
        <h3>{member.name}</h3>
        <p>{member.email}</p>
      </CardHeader>
      <CardFooter>
        {onEdit && <Button onClick={onEdit}>編集</Button>}
        {onDelete && <Button onClick={onDelete} variant="danger">削除</Button>}
      </CardFooter>
    </Card>
  )
}
```

### 3. UI Components

**Location**: `resources/js/Components/ui/`

**Characteristics:**
- Pure presentational
- No business logic
- No data fetching
- Named exports
- Highly reusable

**Example:**
```typescript
// resources/js/Components/ui/Button.tsx
interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'rounded-md font-medium transition-colors',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
```

### 4. Custom Hooks

**Location**: `resources/js/hooks/`

**Characteristics:**
- Data fetching logic
- Business logic
- Start with `use` prefix
- Return objects with named properties
- Named exports

**Example:**
```typescript
// resources/js/hooks/useMembers.ts
export function useMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetch('/api/members').then(res => res.json())
      setMembers(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { members, isLoading, error, refetch }
}
```

### 5. Layout Components

**Location**: `resources/js/Layouts/`

**Characteristics:**
- Wrap page content
- Handle navigation, header, footer
- Receive user/auth data
- Named exports

**Example:**
```typescript
// resources/js/Layouts/AuthenticatedLayout.tsx
interface Props {
  user: User
  children: React.ReactNode
}

export function AuthenticatedLayout({ user, children }: Props) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={user} />
      <Navigation user={user} />
      <main className="container mx-auto py-6">
        {children}
      </main>
      <Footer />
    </div>
  )
}
```

## Navigation Patterns

### Using Inertia Router

```typescript
import { router } from '@inertiajs/react'
import { Link } from '@inertiajs/react'

// Declarative navigation (for static links)
<Link href={route('members.show', { id })}>
  詳細を見る
</Link>

// Programmatic navigation (after form submit, etc.)
router.visit(route('members.index'))

// With options
router.visit(route('members.index'), {
  preserveState: true,    // Keep component state
  preserveScroll: true,   // Keep scroll position
  only: ['members'],      // Only reload specific props
})

// Reload current page with new data
router.reload({
  only: ['members'],      // Only reload members prop
})

// Navigate back
router.visit(route('members.index'), {
  replace: true,          // Replace history instead of push
})
```

### Route Helper

```typescript
// Using ziggy route helper (included with Inertia)
route('members.index')                    // /members
route('members.show', { id: '123' })      // /members/123
route('members.edit', { member: '123' })  // /members/123/edit

// Check current route
route().current('members.index')          // true/false
route().current('members.*')              // true for any members route
```

### Form Navigation

```typescript
// After successful form submission
const form = useForm(/* ... */)

form.submit({
  onSuccess: () => {
    router.visit(route('members.index'))
  },
  onError: (errors) => {
    // Stay on form with errors
    console.error('Validation failed:', errors)
  },
})
```

## Quality Requirements

### Non-Negotiable Standards

#### 1. Preserve External Contracts

```typescript
// ✅ Good: Backward compatible change
interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' // Added new variant
  onClick?: () => void
}

// ❌ Bad: Breaking change
interface ButtonProps {
  children: React.ReactNode
  variant: 'ghost' | 'solid' // Changed required prop
  onClick: () => void // Made optional prop required
}
```

#### 2. Type Safety

```typescript
// ✅ Good: Strict types
interface Member {
  id: string
  name: string
  email: string
  role: 'admin' | 'member' | 'guest'
}

// ❌ Bad: Using any
interface Member {
  id: any
  name: any
  email: any
  role: any
}
```

#### 3. No New Ignores

```typescript
// ✅ Good: Fix the type issue
const value: string = data.value as string

// ❌ Bad: Suppress the error
// @ts-ignore
const value = data.value

// ✅ Good: Document unavoidable any
/**
 * External library returns unknown type
 * TODO: Add type definitions for library
 */
const result = externalLib.getData() as any
```

#### 4. Resolve Warnings

```typescript
// ✅ Good: Fix ESLint/Biome warnings
useEffect(() => {
  fetchData()
}, [fetchData]) // Added dependency

// ❌ Bad: Disable warning
useEffect(() => {
  fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

### Code Quality Checks

Run these commands before committing:

```bash
# Type check
bun run typecheck

# Lint and format check
bun run check

# Run tests
bun run test

# Build verification
bun run build
```

### Import Organization

```typescript
// ✅ Good: Organized imports
// 1. External dependencies
import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'

// 2. Internal utilities/types
import { cn } from '@/lib/utils'
import type { Member } from '@/types/models'

// 3. Components
import { Button } from '@/Components/ui/Button'
import { Card } from '@/Components/ui/Card'

// 4. Hooks
import { useMembers } from '@/hooks/useMembers'

// ❌ Bad: Barrel imports (performance issue)
import { Button, Card, Input } from '@/Components/ui'
```

### File Naming

```typescript
// ✅ Good: PascalCase for components
Button.tsx
MemberCard.tsx
AuthenticatedLayout.tsx

// ✅ Good: camelCase for hooks and utilities
useMembers.ts
formatDate.ts
apiClient.ts

// ✅ Good: kebab-case for directories
components/features/member-management/
hooks/use-authentication/
```

## Best Practices Checklist

### Component Design
- [ ] Single responsibility per component
- [ ] Props are well-typed with interfaces
- [ ] Component is testable via props
- [ ] No business logic in presentational components
- [ ] Data fetching is in custom hooks

### Code Quality
- [ ] TypeScript strict mode enabled
- [ ] No `any` types (use `unknown` if necessary)
- [ ] All imports are direct (no barrel imports)
- [ ] ESLint/Biome warnings resolved
- [ ] Tests pass
- [ ] Build succeeds

### File Organization
- [ ] Files are in correct directories
- [ ] File names follow conventions
- [ ] Imports are organized
- [ ] No circular dependencies

### Navigation
- [ ] Use `Link` for declarative navigation
- [ ] Use `router.visit` for programmatic navigation
- [ ] Use `route()` helper for URL generation
- [ ] Proper state preservation options

### Type Safety
- [ ] Props interfaces defined
- [ ] Return types specified for functions
- [ ] Event handlers properly typed
- [ ] No type assertions without comments

## Common Patterns

### Loading States

```typescript
// ✅ Skeleton for better UX
if (isLoading) return <MemberSkeleton />

// ❌ Generic spinner
if (isLoading) return <Spinner />
```

### Error States

```typescript
// ✅ Actionable error with retry
if (error) return <ErrorState error={error} onRetry={refetch} />

// ❌ Generic error message
if (error) return <div>Error</div>
```

### Empty States

```typescript
// ✅ Helpful empty state with action
if (data.length === 0) {
  return (
    <EmptyState
      title="メンバーがいません"
      description="新しいメンバーを追加して始めましょう"
      action={<Button onClick={onCreate}>メンバーを追加</Button>}
    />
  )
}

// ❌ Unhelpful empty state
if (data.length === 0) return <div>No data</div>
```

### Conditional Rendering

```typescript
// ✅ Early returns for clarity
if (!user) return <LoginPrompt />
if (isLoading) return <Skeleton />
if (error) return <ErrorState error={error} />

return <Content />

// ❌ Nested ternaries
return user ? (isLoading ? <Skeleton /> : (error ? <Error /> : <Content />)) : <Login />
```

## Quick Reference

**Remember:**
1. Page components use `export default`
2. All other components use named exports
3. Hooks start with `use`
4. Presentational components receive all data via props
5. Data fetching is in custom hooks
6. No barrel imports
7. TypeScript strict mode always
8. Test before commit
