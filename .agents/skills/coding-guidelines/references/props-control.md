# Props Control - Making Components Controllable

## Overview

**AI's critical failure**: Creating components that cannot be controlled externally because all state is internal.

This document provides patterns for ensuring all component states can be controlled via props, making components testable and reusable.

## The Problem: Uncontrollable Components

### Anti-Pattern: Internal State Cannot Be Tested

```typescript
// ❌ AI writes: Internal state cannot be controlled
function DataTable({ endpoint }: { endpoint: string }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(endpoint)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [endpoint])

  // Problem: Cannot control loading/error states from parent
  // Problem: Cannot test different states without mocking fetch
  if (loading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  return <Table data={data} />
}
```

**Why this is problematic:**
1. Cannot test loading state without complex mocking
2. Cannot test error state without making fetch fail
3. Cannot control component state from parent
4. Cannot use component with different data sources
5. Hard to test edge cases
6. Component is not reusable

### Testing Challenges

```typescript
// ❌ Hard to test each state
test('displays loading spinner', async () => {
  // Need to mock fetch AND control timing
  global.fetch = vi.fn(() =>
    new Promise(resolve => setTimeout(resolve, 100))
  )

  render(<DataTable endpoint="/api/data" />)
  expect(screen.getByRole('status')).toBeInTheDocument()

  // Need to wait and cleanup
  await waitFor(() => {
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
```

## The Solution: Props-Controlled Components

### Pattern 1: Separate Data Fetching from Presentation

```typescript
// ✅ Step 1: Extract data fetching into custom hook
function useTableData(endpoint: string) {
  const [data, setData] = useState<TableRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await fetch(endpoint).then(res => res.json())
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, isLoading, error, refetch }
}

// ✅ Step 2: Presentational component - fully controllable
interface DataTableProps {
  data: TableRow[]
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

function DataTable({ data, isLoading, error, onRetry }: DataTableProps) {
  if (isLoading) return <TableSkeleton />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (data.length === 0) return <EmptyState />

  return <Table data={data} />
}

// ✅ Step 3: Page component - composition
export default function MemberList() {
  const { data, isLoading, error, refetch } = useTableData('/api/members')

  return (
    <DataTable
      data={data}
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
    />
  )
}
```

### Benefits: Easy Testing

```typescript
// ✅ Test loading state - no mocking needed
test('displays loading skeleton', () => {
  render(<DataTable data={[]} isLoading={true} />)
  expect(screen.getByTestId('table-skeleton')).toBeInTheDocument()
})

// ✅ Test error state - just pass error
test('displays error state with retry button', async () => {
  const error = new Error('Failed to load')
  const onRetry = vi.fn()

  render(<DataTable data={[]} error={error} onRetry={onRetry} />)

  expect(screen.getByText(/Failed to load/)).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /再試行/ }))
  expect(onRetry).toHaveBeenCalledTimes(1)
})

// ✅ Test success state - just pass data
test('displays table with data', () => {
  const data = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ]

  render(<DataTable data={data} />)

  expect(screen.getByText('Alice')).toBeInTheDocument()
  expect(screen.getByText('Bob')).toBeInTheDocument()
})

// ✅ Test empty state
test('displays empty state when no data', () => {
  render(<DataTable data={[]} isLoading={false} />)
  expect(screen.getByText(/データがありません/)).toBeInTheDocument()
})
```

## Pattern 2: Complex Interactive Component

### Modal Component

```typescript
// ❌ AI writes: Modal controls its own visibility
function Modal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  // Problem: Parent cannot control modal state
  // Problem: Cannot test open/close behavior

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && (
        <div className="modal">
          {children}
          <button onClick={() => setIsOpen(false)}>Close</button>
        </div>
      )}
    </>
  )
}

// ✅ Correct: Modal state controlled by props
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
        <button onClick={onClose}>閉じる</button>
      </div>
    </div>
  )
}

// Usage
export default function MemberPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        モーダルを開く
      </Button>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2>モーダルコンテンツ</h2>
      </Modal>
    </>
  )
}
```

### Testing Controlled Modal

```typescript
// ✅ Easy to test all states
test('displays modal when open', () => {
  render(
    <Modal isOpen={true} onClose={vi.fn()}>
      <div>Content</div>
    </Modal>
  )
  expect(screen.getByText('Content')).toBeInTheDocument()
})

test('does not display modal when closed', () => {
  render(
    <Modal isOpen={false} onClose={vi.fn()}>
      <div>Content</div>
    </Modal>
  )
  expect(screen.queryByText('Content')).not.toBeInTheDocument()
})

test('calls onClose when close button clicked', async () => {
  const onClose = vi.fn()
  render(
    <Modal isOpen={true} onClose={onClose}>
      <div>Content</div>
    </Modal>
  )

  await userEvent.click(screen.getByRole('button', { name: /閉じる/ }))
  expect(onClose).toHaveBeenCalledTimes(1)
})
```

## Pattern 3: Form Component with Controlled State

```typescript
// ❌ AI writes: Form controls its own state
function SearchForm({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('')

  // Problem: Parent cannot control query value
  // Problem: Cannot reset form from parent

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      onSearch(query)
    }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </form>
  )
}

// ✅ Correct: Controlled form
interface SearchFormProps {
  query: string
  onQueryChange: (query: string) => void
  onSubmit: () => void
}

function SearchForm({ query, onQueryChange, onSubmit }: SearchFormProps) {
  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      onSubmit()
    }}>
      <Input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="検索..."
      />
      <Button type="submit">検索</Button>
    </form>
  )
}

// Usage with controlled state
export default function MemberSearch() {
  const [query, setQuery] = useState('')
  const { results, search } = useSearch()

  const handleSubmit = () => {
    search(query)
  }

  const handleReset = () => {
    setQuery('') // Can reset from parent
  }

  return (
    <div>
      <SearchForm
        query={query}
        onQueryChange={setQuery}
        onSubmit={handleSubmit}
      />
      <Button onClick={handleReset}>リセット</Button>
      <SearchResults results={results} />
    </div>
  )
}
```

## Pattern 4: Toggle Component

```typescript
// ❌ AI writes: Toggle controls its own state
function Toggle({ label }: { label: string }) {
  const [enabled, setEnabled] = useState(false)

  // Problem: Parent cannot control toggle state
  // Problem: Cannot test different states

  return (
    <button onClick={() => setEnabled(!enabled)}>
      {label}: {enabled ? 'ON' : 'OFF'}
    </button>
  )
}

// ✅ Correct: Controlled toggle
interface ToggleProps {
  label: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

function Toggle({ label, enabled, onChange, disabled }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={enabled ? 'toggle-on' : 'toggle-off'}
    >
      {label}: {enabled ? 'ON' : 'OFF'}
    </button>
  )
}

// Usage
export default function Settings() {
  const [notifications, setNotifications] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div>
      <Toggle
        label="通知"
        enabled={notifications}
        onChange={setNotifications}
      />
      <Toggle
        label="ダークモード"
        enabled={darkMode}
        onChange={setDarkMode}
      />
    </div>
  )
}
```

### Testing Controlled Toggle

```typescript
// ✅ Easy to test all states
test('displays toggle as on', () => {
  render(
    <Toggle label="通知" enabled={true} onChange={vi.fn()} />
  )
  expect(screen.getByText(/通知: ON/)).toBeInTheDocument()
})

test('displays toggle as off', () => {
  render(
    <Toggle label="通知" enabled={false} onChange={vi.fn()} />
  )
  expect(screen.getByText(/通知: OFF/)).toBeInTheDocument()
})

test('calls onChange when clicked', async () => {
  const onChange = vi.fn()
  render(
    <Toggle label="通知" enabled={false} onChange={onChange} />
  )

  await userEvent.click(screen.getByRole('button'))
  expect(onChange).toHaveBeenCalledWith(true)
})

test('does not call onChange when disabled', async () => {
  const onChange = vi.fn()
  render(
    <Toggle label="通知" enabled={false} onChange={onChange} disabled={true} />
  )

  await userEvent.click(screen.getByRole('button'))
  expect(onChange).not.toHaveBeenCalled()
})
```

## Pattern 5: Accordion Component

```typescript
// ✅ Controlled accordion
interface AccordionProps {
  items: AccordionItem[]
  openIndex: number | null
  onToggle: (index: number) => void
}

function Accordion({ items, openIndex, onToggle }: AccordionProps) {
  return (
    <div>
      {items.map((item, index) => (
        <div key={index}>
          <button onClick={() => onToggle(index)}>
            {item.title}
          </button>
          {openIndex === index && (
            <div>{item.content}</div>
          )}
        </div>
      ))}
    </div>
  )
}

// Usage with controlled state
export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const items = [
    { title: 'Q1', content: 'Answer 1' },
    { title: 'Q2', content: 'Answer 2' },
  ]

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return <Accordion items={items} openIndex={openIndex} onToggle={handleToggle} />
}
```

## Controlled vs Uncontrolled: When to Use Each

### Use Controlled Components (Recommended)

**When:**
- Component is used in multiple places
- Parent needs to control state
- Testing is important
- State needs to be synced with other components
- State needs to be persisted or logged

**Pattern:**
```typescript
// ✅ Controlled
function Component({ value, onChange }: Props) {
  return <input value={value} onChange={onChange} />
}
```

### Use Uncontrolled Components (Rare)

**When:**
- Simple form with no validation
- No need to control from parent
- Performance optimization (avoid re-renders)

**Pattern:**
```typescript
// ⚠️ Uncontrolled (use sparingly)
function SimpleForm() {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    console.log(inputRef.current?.value)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} />
    </form>
  )
}
```

## Checklist: Props Control

Before considering a component complete, verify:

- [ ] All state that affects rendering is controllable via props
- [ ] Loading states can be controlled from parent
- [ ] Error states can be controlled from parent
- [ ] All event handlers are passed as props (onChange, onClick, etc.)
- [ ] Component can be tested without mocking data fetching
- [ ] Each display variation can be triggered via props
- [ ] Component is reusable in different contexts

## Quick Reference: Refactoring Steps

1. **Identify internal state** that affects rendering
2. **Move state to parent** component
3. **Pass state as props** to child component
4. **Pass event handlers** as props for state updates
5. **Test each state** by passing different props
6. **Extract data fetching** to custom hooks if present

**Remember**: If you can't easily test a component by just changing props, it's not controllable enough.
