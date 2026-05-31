# Testability Patterns - Separating Data Fetching from Presentation

## Overview

**AI's most critical failure**: Creating components that control UI branches with internal state, making them impossible to test independently.

This document provides comprehensive patterns for ensuring React components are fully testable by separating data fetching logic from presentational concerns.

## The Problem: Untestable Components

### Anti-Pattern: Data Fetching in Component

```typescript
// ❌ Typical AI pattern (untestable)
function UserProfile({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => setError(err))
      .finally(() => setLoading(false))
  }, [userId])

  // Problem: Cannot test each state independently
  if (loading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  if (!user) return <div>Not found</div>

  return <div>{user.name}</div>
}
```

**Why this is problematic:**
1. Cannot test loading state without mocking fetch
2. Cannot test error state without making fetch fail
3. Cannot test success state without real API call
4. Cannot test "not found" state independently
5. Tests become flaky and slow
6. Each test requires complex setup

### Testing Challenges

```typescript
// ❌ Complex test setup required
test('displays user name', async () => {
  // Need to mock fetch
  global.fetch = vi.fn().mockResolvedValue({
    json: async () => ({ name: 'Taro', id: '1' })
  })

  render(<UserProfile userId="1" />)

  // Need to wait for async operation
  await waitFor(() => {
    expect(screen.getByText('Taro')).toBeInTheDocument()
  })
})

// ❌ Testing loading state is painful
test('displays loading spinner', () => {
  global.fetch = vi.fn().mockImplementation(
    () => new Promise(resolve => setTimeout(resolve, 100))
  )

  render(<UserProfile userId="1" />)
  expect(screen.getByRole('status')).toBeInTheDocument()
})
```

## The Solution: Separate Data Fetching from Presentation

### Pattern 1: Custom Hook + Presentational Component

```typescript
// ✅ Step 1: Extract data fetching into custom hook
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(setUser)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [userId])

  return { user, isLoading, error }
}

// ✅ Step 2: Create presentational component
interface UserProfileProps {
  user: User | null
  isLoading?: boolean
  error?: Error | null
}

function UserProfile({ user, isLoading, error }: UserProfileProps) {
  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  if (!user) return <div>Not found</div>

  return <div>{user.name}</div>
}

// ✅ Step 3: Compose in page component
export default function Show({ userId }: { userId: string }) {
  const { user, isLoading, error } = useUser(userId)
  return <UserProfile user={user} isLoading={isLoading} error={error} />
}
```

### Benefits of Separation

**Easy Testing:**
```typescript
// ✅ Test loading state - no mocking needed
test('displays loading spinner', () => {
  render(<UserProfile user={null} isLoading={true} />)
  expect(screen.getByRole('status')).toBeInTheDocument()
})

// ✅ Test error state - just pass error prop
test('displays error message', () => {
  const error = new Error('Failed to load')
  render(<UserProfile user={null} error={error} />)
  expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
})

// ✅ Test success state - just pass user data
test('displays user name', () => {
  const user = { name: 'Taro', id: '1' }
  render(<UserProfile user={user} />)
  expect(screen.getByText('Taro')).toBeInTheDocument()
})

// ✅ Test not found state - just pass null
test('displays not found message', () => {
  render(<UserProfile user={null} isLoading={false} />)
  expect(screen.getByText('Not found')).toBeInTheDocument()
})
```

## Pattern 2: Complex Data Fetching

### Multiple Data Sources

```typescript
// ✅ Hook for member data
function useMember(memberId: string) {
  const [member, setMember] = useState<Member | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/members/${memberId}`)
      .then(res => res.json())
      .then(setMember)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [memberId])

  return { member, isLoading, error }
}

// ✅ Hook for member's projects
function useMemberProjects(memberId: string) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/members/${memberId}/projects`)
      .then(res => res.json())
      .then(setProjects)
      .finally(() => setIsLoading(false))
  }, [memberId])

  return { projects, isLoading }
}

// ✅ Presentational component - fully testable
interface MemberDetailProps {
  member: Member | null
  projects: Project[]
  isLoadingMember?: boolean
  isLoadingProjects?: boolean
  error?: Error | null
}

function MemberDetail({
  member,
  projects,
  isLoadingMember,
  isLoadingProjects,
  error,
}: MemberDetailProps) {
  if (isLoadingMember) return <MemberSkeleton />
  if (error) return <ErrorState error={error} />
  if (!member) return <NotFound />

  return (
    <div>
      <MemberHeader member={member} />
      {isLoadingProjects ? (
        <ProjectsSkeleton />
      ) : (
        <ProjectsList projects={projects} />
      )}
    </div>
  )
}

// ✅ Page component - composition
export default function Show({ memberId }: { memberId: string }) {
  const { member, isLoading: memberLoading, error } = useMember(memberId)
  const { projects, isLoading: projectsLoading } = useMemberProjects(memberId)

  return (
    <MemberDetail
      member={member}
      projects={projects}
      isLoadingMember={memberLoading}
      isLoadingProjects={projectsLoading}
      error={error}
    />
  )
}
```

### Easy to Test Each State

```typescript
// ✅ Test loading state for member only
test('displays member skeleton while loading', () => {
  render(
    <MemberDetail
      member={null}
      projects={[]}
      isLoadingMember={true}
      isLoadingProjects={false}
    />
  )
  expect(screen.getByTestId('member-skeleton')).toBeInTheDocument()
})

// ✅ Test projects loading while member is loaded
test('displays projects skeleton while projects loading', () => {
  const member = { id: '1', name: 'Taro', email: 'taro@example.com' }
  render(
    <MemberDetail
      member={member}
      projects={[]}
      isLoadingMember={false}
      isLoadingProjects={true}
    />
  )
  expect(screen.getByText('Taro')).toBeInTheDocument()
  expect(screen.getByTestId('projects-skeleton')).toBeInTheDocument()
})
```

## Pattern 3: Interactive Components with State

### Searchable List Component

```typescript
// ✅ Hook for search logic
function useSearch(items: string[], initialQuery = '') {
  const [query, setQuery] = useState(initialQuery)

  const filteredItems = useMemo(() => {
    if (!query) return items
    return items.filter(item =>
      item.toLowerCase().includes(query.toLowerCase())
    )
  }, [items, query])

  return { query, setQuery, filteredItems }
}

// ✅ Presentational component - fully controllable
interface SearchableListProps {
  items: string[]
  filteredItems: string[]
  query: string
  onQueryChange: (query: string) => void
}

function SearchableList({
  items,
  filteredItems,
  query,
  onQueryChange,
}: SearchableListProps) {
  return (
    <div>
      <SearchInput value={query} onChange={onQueryChange} />
      <div>
        {filteredItems.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          filteredItems.map(item => <ListItem key={item}>{item}</ListItem>)
        )}
      </div>
    </div>
  )
}

// ✅ Page component
export default function MemberSearch({ members }: { members: string[] }) {
  const { query, setQuery, filteredItems } = useSearch(members)

  return (
    <SearchableList
      items={members}
      filteredItems={filteredItems}
      query={query}
      onQueryChange={setQuery}
    />
  )
}
```

### Easy to Test Interactive Behavior

```typescript
// ✅ Test empty state without mocking
test('displays empty state when no matches', () => {
  render(
    <SearchableList
      items={['Alice', 'Bob']}
      filteredItems={[]}
      query="Charlie"
      onQueryChange={vi.fn()}
    />
  )
  expect(screen.getByText(/No results for "Charlie"/)).toBeInTheDocument()
})

// ✅ Test with results
test('displays filtered results', () => {
  render(
    <SearchableList
      items={['Alice', 'Bob', 'Charlie']}
      filteredItems={['Alice']}
      query="Ali"
      onQueryChange={vi.fn()}
    />
  )
  expect(screen.getByText('Alice')).toBeInTheDocument()
  expect(screen.queryByText('Bob')).not.toBeInTheDocument()
})
```

## Checklist: Is Your Component Testable?

Before considering a component complete, verify:

- [ ] Data fetching logic is in custom hooks (not in components)
- [ ] Presentational components receive all data via props
- [ ] All conditional branches can be triggered via props
- [ ] No need to mock fetch/API calls to test different states
- [ ] Each state (loading, error, success, empty) is testable independently
- [ ] Tests are fast (no async waits or timeouts)
- [ ] Component has single responsibility (presentation OR data fetching, not both)

## Quick Reference: Refactoring Steps

1. **Identify data fetching code** in component
2. **Extract to custom hook** (use* naming convention)
3. **Make component accept props** for all states
4. **Test each state** by passing different prop combinations
5. **Compose in page component** that uses the custom hook

**Remember**: If you can't test a component's different states by just changing props, it's not testable enough.
