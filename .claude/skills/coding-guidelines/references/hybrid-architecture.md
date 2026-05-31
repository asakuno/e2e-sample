# Hybrid Architecture - Inertia Props vs API Data

## Overview

**AI's critical mistake**: Mixing static and dynamic data incorrectly by either:
1. Fetching all data via API (slow, no SEO)
2. Passing all data via Inertia props (stale data, no real-time updates)

The hybrid approach uses the right data source for each use case: Inertia for static content, API for dynamic data.

## The Problem: Wrong Data Source Selection

### Anti-Pattern 1: All Data from Inertia (No Dynamic Updates)

```typescript
// ❌ AI writes: All data from Inertia (data becomes stale)
export default function Dashboard({ stats, notifications }: Props) {
  // Problem: Data is stale until full page reload
  // Problem: No way to update stats without page refresh
  // Problem: Notifications don't update in real-time

  return (
    <div>
      <StatsCard stats={stats} />
      <NotificationList notifications={notifications} />
    </div>
  )
}
```

**Why this is wrong:**
- Stats are stale until page reload
- Notifications don't update without refresh
- Poor user experience for real-time features
- Users miss new notifications or updated stats

### Anti-Pattern 2: All Data from API (Unnecessary for Static Content)

```typescript
// ❌ AI writes: All data from API (slow initial load, no SEO)
export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [stats, setStats] = useState(null)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    // Problem: Fetching static data on every page load
    fetch('/api/user').then(...)
    fetch('/api/permissions').then(...)
    fetch('/api/menu').then(...)
    fetch('/api/stats').then(...)
    fetch('/api/notifications').then(...)
  }, [])

  // Problem: Loading states for everything
  // Problem: No SEO for static content
  // Problem: Slower initial page load
}
```

**Why this is wrong:**
- Multiple API calls on every page load
- Loading states for static content
- No SEO benefits (content not in initial HTML)
- Slower time to interactive

## The Solution: Hybrid Architecture

### Pattern 1: Clear Separation of Concerns

```typescript
// ✅ Correct: Hybrid architecture
interface Props {
  // Static data from Inertia (rarely changes)
  user: User
  permissions: Permission[]
  menuItems: MenuItem[]
}

export default function Dashboard({ user, permissions, menuItems }: Props) {
  // Dynamic data from API (frequently changes)
  const { stats, isLoading: statsLoading } = useStats()
  const { notifications, refetch } = useNotifications()

  return (
    <AuthenticatedLayout user={user} menuItems={menuItems}>
      <Head title="ダッシュボード" />

      {/* Static content - from Inertia props */}
      <UserHeader user={user} />

      {/* Dynamic content - from API */}
      <StatsCard stats={stats} isLoading={statsLoading} />
      <NotificationList
        notifications={notifications}
        onMarkAsRead={() => refetch()}
      />
    </AuthenticatedLayout>
  )
}
```

### Custom Hooks for Dynamic Data

```typescript
// ✅ Hook for real-time stats
function useStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const data = await fetch('/api/dashboard/stats').then(res => res.json())
        setStats(data)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return { stats, isLoading }
}

// ✅ Hook for notifications with manual refresh
function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchNotifications = useCallback(async () => {
    const data = await fetch('/api/notifications').then(res => res.json())
    setNotifications(data)
  }, [])

  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications every minute
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return { notifications, refetch: fetchNotifications }
}
```

## Decision Matrix: Inertia Props vs API

### Use Inertia Props (Static Data)

**When to use:**
- User profile and authentication state
- Navigation menus and permissions
- Page-specific configuration
- SEO-critical content
- Data that rarely changes (< once per hour)
- Initial page state

**Examples:**
```typescript
// ✅ Inertia props for static data
interface Props {
  user: User                    // Authenticated user
  permissions: string[]         // User permissions
  menuItems: MenuItem[]         // Navigation menu
  csrfToken: string            // CSRF token
  locale: string               // Current locale
  flashMessages: Flash         // One-time messages
}

export default function PageComponent({ user, permissions, menuItems }: Props) {
  // Use props directly - no loading states needed
  return (
    <AuthenticatedLayout user={user} menu={menuItems}>
      {/* Content */}
    </AuthenticatedLayout>
  )
}
```

### Use API (Dynamic Data)

**When to use:**
- Real-time notifications
- Live statistics and metrics
- Search results with filters
- Paginated lists with sorting
- Data that updates frequently (> once per hour)
- User-initiated actions (refresh, load more)

**Examples:**
```typescript
// ✅ API for dynamic data
export default function Dashboard({ user }: { user: User }) {
  const { stats } = useStats()              // Live stats
  const { notifications } = useNotifications() // Real-time notifications
  const { activities } = useRecentActivities() // Recent activities

  return (
    <AuthenticatedLayout user={user}>
      <StatsSection stats={stats} />
      <NotificationsPanel notifications={notifications} />
      <ActivityFeed activities={activities} />
    </AuthenticatedLayout>
  )
}
```

## Data Fetching Patterns

### Pattern 2: API Utility with Type Safety

```typescript
// ✅ Typed API utility function
async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'same-origin', // Include cookies
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

// Usage with type safety
const stats = await apiGet<DashboardStats>('/api/dashboard/stats')
```

### Pattern 3: Generic Data Fetching Hook

```typescript
// ✅ Reusable data fetching hook
function useApiData<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await apiGet<T>(url)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [url])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, error, isLoading, refetch }
}

// Usage
function MembersList() {
  const { data: members, isLoading, refetch } = useApiData<Member[]>('/api/members')

  return (
    <div>
      <Button onClick={refetch}>更新</Button>
      {isLoading ? <Spinner /> : <MemberList members={members ?? []} />}
    </div>
  )
}
```

### Pattern 4: Search with Debouncing

```typescript
// ✅ Search hook with debouncing
function useSearch(endpoint: string, initialQuery = '') {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Debounce search
  useEffect(() => {
    if (!query) {
      setResults([])
      return
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const data = await apiGet<SearchResult[]>(
          `${endpoint}?q=${encodeURIComponent(query)}`
        )
        setResults(data)
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [query, endpoint])

  return { query, setQuery, results, isLoading }
}

// Usage
export default function MemberSearch() {
  const { query, setQuery, results, isLoading } = useSearch('/api/members/search')

  return (
    <div>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="メンバーを検索..."
      />
      {isLoading ? (
        <Spinner />
      ) : (
        <SearchResults results={results} />
      )}
    </div>
  )
}
```

### Pattern 5: Pagination

```typescript
// ✅ Pagination hook
function usePagination<T>(endpoint: string, perPage = 10) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPage = async () => {
      setIsLoading(true)
      try {
        const response = await apiGet<PaginatedResponse<T>>(
          `${endpoint}?page=${page}&per_page=${perPage}`
        )
        setData(response.data)
        setTotal(response.total)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPage()
  }, [endpoint, page, perPage])

  return {
    data,
    page,
    setPage,
    total,
    isLoading,
    hasNext: page * perPage < total,
    hasPrevious: page > 1,
  }
}

// Usage
export default function MemberList() {
  const {
    data: members,
    page,
    setPage,
    total,
    isLoading,
    hasNext,
    hasPrevious,
  } = usePagination<Member>('/api/members', 20)

  return (
    <div>
      <MemberTable members={members} isLoading={isLoading} />
      <Pagination
        page={page}
        onPageChange={setPage}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        total={total}
      />
    </div>
  )
}
```

## Real-World Examples

### Example 1: Member Detail Page

```typescript
// ✅ Hybrid approach for member detail
interface Props {
  // Static: Member basic info (from Inertia)
  member: Member
  // Static: User's permissions (from Inertia)
  canEdit: boolean
  canDelete: boolean
}

export default function MemberShow({ member, canEdit, canDelete }: Props) {
  // Dynamic: Recent activities
  const { data: activities, isLoading: activitiesLoading } =
    useApiData<Activity[]>(`/api/members/${member.id}/activities`)

  // Dynamic: Assigned projects
  const { data: projects, isLoading: projectsLoading } =
    useApiData<Project[]>(`/api/members/${member.id}/projects`)

  return (
    <AuthenticatedLayout>
      <Head title={member.name} />

      {/* Static content from Inertia */}
      <MemberHeader member={member} canEdit={canEdit} canDelete={canDelete} />

      {/* Dynamic content from API */}
      <Section title="最近のアクティビティ">
        {activitiesLoading ? (
          <ActivitySkeleton />
        ) : (
          <ActivityList activities={activities ?? []} />
        )}
      </Section>

      <Section title="担当プロジェクト">
        {projectsLoading ? (
          <ProjectSkeleton />
        ) : (
          <ProjectList projects={projects ?? []} />
        )}
      </Section>
    </AuthenticatedLayout>
  )
}
```

### Example 2: Dashboard with Real-time Updates

```typescript
// ✅ Dashboard with mixed data sources
interface Props {
  user: User              // Static: Authenticated user
  quickLinks: Link[]      // Static: User's quick links
}

export default function Dashboard({ user, quickLinks }: Props) {
  // Dynamic: Live stats
  const { stats, isLoading: statsLoading } = useStats()

  // Dynamic: Notifications with polling
  const { notifications } = useNotifications()

  // Dynamic: Recent activities
  const { activities } = useRecentActivities(10)

  return (
    <AuthenticatedLayout user={user}>
      <Head title="ダッシュボード" />

      {/* Static content */}
      <WelcomeMessage user={user} />
      <QuickLinks links={quickLinks} />

      {/* Dynamic content */}
      <div className="grid grid-cols-2 gap-4">
        <StatsCard stats={stats} isLoading={statsLoading} />
        <NotificationsWidget notifications={notifications} />
      </div>

      <RecentActivities activities={activities} />
    </AuthenticatedLayout>
  )
}
```

## Checklist: Hybrid Architecture

Before considering data fetching implementation complete, verify:

- [ ] Static data (user, permissions, menu) comes from Inertia props
- [ ] Dynamic data (stats, notifications) comes from API
- [ ] No unnecessary API calls for static content
- [ ] Real-time updates work for dynamic content
- [ ] SEO-critical content is in Inertia props
- [ ] Loading states only for dynamic content
- [ ] Data fetching is in custom hooks (not in components)
- [ ] Type safety for all API responses

## Quick Reference: Decision Tree

**Ask yourself:**
1. Does this data change frequently? → API
2. Is this data user-specific? → Inertia props
3. Does this need real-time updates? → API
4. Is this needed for SEO? → Inertia props
5. Is this from user action (search, filter)? → API
6. Is this page configuration? → Inertia props

**Remember**: Inertia for the page structure, API for the dynamic content within it.
