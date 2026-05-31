# Inertia 中心アーキテクチャ - データ取得戦略

## Overview

Inertia v2.3+ の機能（Partial Reloads, Deferred Props, Polling）を最大限活用し、データ取得を Inertia に集約する。API は外部サービス連携やモバイルアプリ用途のみに使用する。

**AI's critical mistake**: 不要な API エンドポイントを作成してしまう。Inertia のネイティブ機能で実現可能なケースが大半。

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

## 正しいアプローチ: Inertia 中心アーキテクチャ

### Pattern 1: Inertia Props + Deferred Props + Polling

```typescript
// ✅ Inertia 中心: API エンドポイント不要
import { usePoll } from '@inertiajs/react';

interface Props {
  // ページデータ（Inertia props）
  user: User
  permissions: Permission[]
  menuItems: MenuItem[]
  // 遅延ロード（Deferred Props）
  stats?: DashboardStats
  // Polling で定期更新
  notifications: Notification[]
}

export default function Dashboard({ user, permissions, menuItems, stats, notifications }: Props) {
  // 30秒ごとに notifications を自動更新
  usePoll(30000, { only: ['notifications'] });

  return (
    <AuthenticatedLayout user={user} menuItems={menuItems}>
      <Head title="ダッシュボード" />
      <UserHeader user={user} />
      {stats ? <StatsCard stats={stats} /> : <StatsCardSkeleton />}
      <NotificationList notifications={notifications} />
    </AuthenticatedLayout>
  )
}
```

### サーバー側（Laravel Controller）

```php
// ✅ Deferred Props と通常 Props の組み合わせ
public function index(): Response
{
    return Inertia::render('Dashboard', [
        'user' => auth()->user(),
        'permissions' => fn () => auth()->user()->permissions,
        'menuItems' => fn () => MenuItem::forUser(auth()->user()),
        'stats' => Inertia::defer(fn () => $this->statsUseCase->execute()),
        'notifications' => fn () => auth()->user()->unreadNotifications()->limit(10)->get(),
    ]);
}
```

## Decision Matrix: Inertia 機能 vs API

### Use Inertia Props（ページデータ）

- ユーザープロファイル、認証状態
- ナビゲーションメニュー、権限
- ページ固有の設定
- SEO 重要コンテンツ
- 初期ページ状態

### Use Inertia Partial Reloads（動的更新）

- 検索結果のフィルタリング
- ソート付きページネーション
- ユーザー操作による部分更新

### Use Inertia Deferred Props（遅延ロード）

- 重い集計データ
- 初期表示に不要なセカンダリデータ

### Use Inertia Polling（定期更新）

- 通知の定期取得
- ダッシュボード統計の定期更新

### Use API（外部連携のみ）

- 外部サービス連携（Stripe, SendGrid 等）
- モバイルアプリ向け REST API
- 非 HTML レスポンス（CSV, PDF ダウンロード）

**Examples:**
```typescript
// ✅ Inertia 中心: すべてのデータを Inertia 経由で取得
import { usePoll } from '@inertiajs/react';

interface Props {
  user: User
  posts: Post[]
  stats?: DashboardStats  // Deferred Props（遅延ロード）
  notifications: Notification[]
}

export default function Dashboard({ user, posts, stats, notifications }: Props) {
  // 30秒ごとに notifications を再取得
  usePoll(30000, { only: ['notifications'] });

  return (
    <AuthenticatedLayout user={user}>
      <StatsCard stats={stats} />
      <NotificationsPanel notifications={notifications} />
      <PostList posts={posts} />
    </AuthenticatedLayout>
  )
}
```

## Inertia データ取得パターン

### Pattern 2: Partial Reloads（検索・フィルタ）

```typescript
// ✅ Inertia Partial Reloads で検索
import { router } from '@inertiajs/react';
import { index } from '@/routes/members';

interface Props {
  members: Member[]
  filters: { q?: string; status?: string }
}

export default function MemberIndex({ members, filters }: Props) {
  const handleSearch = (q: string) => {
    router.reload({
      data: { q },
      only: ['members'],
    });
  };

  const handleFilterChange = (status: string) => {
    router.reload({
      data: { ...filters, status },
      only: ['members'],
    });
  };

  return (
    <div>
      <SearchInput
        defaultValue={filters.q}
        onChange={handleSearch}
        placeholder="メンバーを検索..."
      />
      <StatusFilter value={filters.status} onChange={handleFilterChange} />
      <MemberList members={members} />
    </div>
  )
}
```

### Pattern 3: Deferred Props（重いデータの遅延ロード）

```typescript
// ✅ Deferred Props でセカンダリデータを遅延ロード
interface Props {
  member: Member
  canEdit: boolean
  canDelete: boolean
  // Deferred Props（サーバー側で Inertia::defer() を使用）
  activities?: Activity[]
  projects?: Project[]
}

export default function MemberShow({ member, canEdit, canDelete, activities, projects }: Props) {
  return (
    <AuthenticatedLayout>
      <Head title={member.name} />
      <MemberHeader member={member} canEdit={canEdit} canDelete={canDelete} />

      <Section title="最近のアクティビティ">
        {activities ? <ActivityList activities={activities} /> : <ActivitySkeleton />}
      </Section>

      <Section title="担当プロジェクト">
        {projects ? <ProjectList projects={projects} /> : <ProjectSkeleton />}
      </Section>
    </AuthenticatedLayout>
  )
}
```

サーバー側:
```php
public function show(Member $member): Response
{
    return Inertia::render('Member/Show', [
        'member' => $member,
        'canEdit' => auth()->user()->can('update', $member),
        'canDelete' => auth()->user()->can('delete', $member),
        'activities' => Inertia::defer(fn () => $member->activities()->latest()->limit(10)->get()),
        'projects' => Inertia::defer(fn () => $member->projects()->get()),
    ]);
}
```

### Pattern 4: Polling（定期自動更新）

```typescript
// ✅ Inertia Polling で定期更新
import { usePoll } from '@inertiajs/react';

interface Props {
  user: User
  quickLinks: Link[]
  stats?: DashboardStats       // Deferred Props
  notifications: Notification[]
  activities: Activity[]
}

export default function Dashboard({ user, quickLinks, stats, notifications, activities }: Props) {
  // 30秒ごとに notifications と activities を自動更新
  usePoll(30000, { only: ['notifications', 'activities'] });

  return (
    <AuthenticatedLayout user={user}>
      <Head title="ダッシュボード" />
      <WelcomeMessage user={user} />
      <QuickLinks links={quickLinks} />

      <div className="grid grid-cols-2 gap-4">
        {stats ? <StatsCard stats={stats} /> : <StatsCardSkeleton />}
        <NotificationsWidget notifications={notifications} />
      </div>

      <RecentActivities activities={activities} />
    </AuthenticatedLayout>
  )
}
```

### Pattern 5: ページネーション（Partial Reloads）

```typescript
// ✅ Inertia Partial Reloads でページネーション
import { router } from '@inertiajs/react';

interface Props {
  members: {
    data: Member[]
    current_page: number
    last_page: number
    total: number
  }
}

export default function MemberList({ members }: Props) {
  const handlePageChange = (page: number) => {
    router.reload({
      data: { page },
      only: ['members'],
    });
  };

  return (
    <div>
      <MemberTable members={members.data} />
      <Pagination
        page={members.current_page}
        onPageChange={handlePageChange}
        lastPage={members.last_page}
        total={members.total}
      />
    </div>
  )
}
```

## Checklist: Inertia 中心アーキテクチャ

Before considering data fetching implementation complete, verify:

- [ ] ページデータ（user, permissions, menu）は Inertia props で提供
- [ ] 動的データは Inertia Partial Reloads / Deferred Props / Polling で取得
- [ ] 不要な API エンドポイントを作成していない
- [ ] SEO 重要コンテンツは Inertia props に含まれる
- [ ] Deferred Props で遅延ロードするデータにはスケルトンを表示
- [ ] 型安全性が確保されている

## Quick Reference: Decision Tree

**Ask yourself:**
1. ページ表示に必要なデータ？ → Inertia props
2. 初期表示に不要だが同一ページで必要？ → Inertia Deferred Props
3. ユーザー操作で更新？（検索、フィルタ） → Inertia Partial Reloads
4. 定期的に自動更新？ → Inertia Polling
5. 外部サービスやモバイルアプリ向け？ → API

**Remember**: Inertia ですべてのウェブ UI データを管理。API は外部連携のみ。
