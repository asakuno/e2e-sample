# Conditional Branch Extraction

## Overview

**AI's critical failure**: Cramming multiple conditional branches into one component, making it hard to test and maintain.

This document provides patterns for extracting conditional branches into separate components, improving testability and readability.

## The Problem: Nested Conditional Branches

### Anti-Pattern: Cramming Branches into One Component

```typescript
// ❌ AI writes: Nested conditional branches
function Dashboard() {
  const { user } = usePage<Props>().props
  const { stats, isLoading } = useStats()

  return (
    <div>
      {user ? (
        isLoading ? (
          <Spinner />
        ) : stats ? (
          <StatsCard stats={stats} />
        ) : (
          <NoData />
        )
      ) : (
        <LoginPrompt />
      )}
    </div>
  )
}
```

**Why this is problematic:**
1. Hard to read and understand flow
2. Difficult to test each branch independently
3. Cannot reuse individual states
4. Hard to maintain
5. Violates single responsibility principle

### Testing Challenges

```typescript
// ❌ Complex test setup for nested branches
test('displays stats card when user is logged in and data is loaded', () => {
  // Need to mock both user and stats
  // Need to coordinate multiple states
  // Hard to isolate specific branch
})
```

## The Solution: Extract Each Branch

### Pattern 1: Extract Branches into Components

```typescript
// ✅ Correct: Extracted components
interface Props {
  user: User | null
}

export default function Dashboard({ user }: Props) {
  if (!user) return <LoginPrompt />

  return (
    <AuthenticatedLayout>
      <StatsSection />
    </AuthenticatedLayout>
  )
}

function StatsSection() {
  const { stats, isLoading, error } = useStats()

  return (
    <StatsCard
      stats={stats}
      isLoading={isLoading}
      error={error}
    />
  )
}

// Presentational - testable
interface StatsCardProps {
  stats: Stats | null
  isLoading?: boolean
  error?: Error | null
}

function StatsCard({ stats, isLoading, error }: StatsCardProps) {
  if (isLoading) return <StatsSkeleton />
  if (error) return <StatsError error={error} />
  if (!stats) return <NoStatsData />

  return (
    <Card>
      <CardHeader>統計情報</CardHeader>
      <CardContent>
        <Metric label="総会員数" value={stats.totalMembers} />
        <Metric label="アクティブ" value={stats.activeMembers} />
      </CardContent>
    </Card>
  )
}
```

### Benefits: Easy Testing

```typescript
// ✅ Test each state independently
test('displays loading skeleton', () => {
  render(<StatsCard stats={null} isLoading={true} />)
  expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument()
})

test('displays error state', () => {
  const error = new Error('Failed to load')
  render(<StatsCard stats={null} error={error} />)
  expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
})

test('displays no data message', () => {
  render(<StatsCard stats={null} isLoading={false} />)
  expect(screen.getByText(/データがありません/)).toBeInTheDocument()
})

test('displays stats', () => {
  const stats = { totalMembers: 100, activeMembers: 80 }
  render(<StatsCard stats={stats} />)
  expect(screen.getByText('100')).toBeInTheDocument()
  expect(screen.getByText('80')).toBeInTheDocument()
})
```

## Pattern 2: User Authentication States

### Complex Nested Branches

```typescript
// ❌ AI writes: Complex nesting
function MemberProfile({ memberId }: { memberId: string }) {
  const { user } = usePage().props
  const { member, isLoading } = useMember(memberId)

  return (
    <div>
      {user ? (
        user.id === memberId ? (
          isLoading ? (
            <Spinner />
          ) : member ? (
            <OwnProfile member={member} />
          ) : (
            <NotFound />
          )
        ) : (
          isLoading ? (
            <Spinner />
          ) : member ? (
            <OtherProfile member={member} />
          ) : (
            <NotFound />
          )
        )
      ) : (
        <LoginPrompt />
      )}
    </div>
  )
}
```

### Extracted and Clear

```typescript
// ✅ Correct: Extracted branches
interface Props {
  memberId: string
  user: User | null
}

export default function MemberProfile({ memberId, user }: Props) {
  if (!user) return <LoginPrompt />

  const isOwnProfile = user.id === memberId

  return (
    <AuthenticatedLayout>
      {isOwnProfile ? (
        <OwnProfileSection memberId={memberId} />
      ) : (
        <OtherProfileSection memberId={memberId} />
      )}
    </AuthenticatedLayout>
  )
}

function OwnProfileSection({ memberId }: { memberId: string }) {
  const { member, isLoading, error } = useMember(memberId)

  return (
    <ProfileCard
      member={member}
      isLoading={isLoading}
      error={error}
      editable={true}
    />
  )
}

function OtherProfileSection({ memberId }: { memberId: string }) {
  const { member, isLoading, error } = useMember(memberId)

  return (
    <ProfileCard
      member={member}
      isLoading={isLoading}
      error={error}
      editable={false}
    />
  )
}

// Reusable presentational component
interface ProfileCardProps {
  member: Member | null
  isLoading?: boolean
  error?: Error | null
  editable: boolean
}

function ProfileCard({ member, isLoading, error, editable }: ProfileCardProps) {
  if (isLoading) return <ProfileSkeleton />
  if (error) return <ProfileError error={error} />
  if (!member) return <NotFound />

  return (
    <Card>
      <ProfileHeader member={member} />
      <ProfileBody member={member} />
      {editable && <ProfileEditButton />}
    </Card>
  )
}
```

## Pattern 3: Multi-State Data Display

### Complex Data Dependencies

```typescript
// ❌ AI writes: All states in one component
function ProjectDashboard({ projectId }: { projectId: string }) {
  const { project, isLoadingProject } = useProject(projectId)
  const { members, isLoadingMembers } = useProjectMembers(projectId)
  const { tasks, isLoadingTasks } = useProjectTasks(projectId)

  return (
    <div>
      {isLoadingProject ? (
        <ProjectSkeleton />
      ) : project ? (
        <>
          <ProjectHeader project={project} />
          {isLoadingMembers ? (
            <MembersSkeleton />
          ) : members.length > 0 ? (
            <MembersList members={members} />
          ) : (
            <NoMembers />
          )}
          {isLoadingTasks ? (
            <TasksSkeleton />
          ) : tasks.length > 0 ? (
            <TasksList tasks={tasks} />
          ) : (
            <NoTasks />
          )}
        </>
      ) : (
        <ProjectNotFound />
      )}
    </div>
  )
}
```

### Extracted and Modular

```typescript
// ✅ Correct: Extracted sections
interface Props {
  projectId: string
}

export default function ProjectDashboard({ projectId }: Props) {
  const { project, isLoading, error } = useProject(projectId)

  if (isLoading) return <ProjectSkeleton />
  if (error) return <ProjectError error={error} />
  if (!project) return <ProjectNotFound />

  return (
    <div>
      <ProjectHeader project={project} />
      <MembersSection projectId={projectId} />
      <TasksSection projectId={projectId} />
    </div>
  )
}

function MembersSection({ projectId }: { projectId: string }) {
  const { members, isLoading } = useProjectMembers(projectId)

  return (
    <MembersCard members={members} isLoading={isLoading} />
  )
}

function TasksSection({ projectId }: { projectId: string }) {
  const { tasks, isLoading } = useProjectTasks(projectId)

  return (
    <TasksCard tasks={tasks} isLoading={isLoading} />
  )
}

// Presentational components
interface MembersCardProps {
  members: Member[]
  isLoading?: boolean
}

function MembersCard({ members, isLoading }: MembersCardProps) {
  if (isLoading) return <MembersSkeleton />
  if (members.length === 0) return <NoMembers />

  return <MembersList members={members} />
}

interface TasksCardProps {
  tasks: Task[]
  isLoading?: boolean
}

function TasksCard({ tasks, isLoading }: TasksCardProps) {
  if (isLoading) return <TasksSkeleton />
  if (tasks.length === 0) return <NoTasks />

  return <TasksList tasks={tasks} />
}
```

## Pattern 4: Permission-Based Rendering

### Complex Permission Checks

```typescript
// ❌ AI writes: Permission checks scattered
function MemberActions({ member }: { member: Member }) {
  const { user } = usePage().props
  const canEdit = user.permissions.includes('members.edit')
  const canDelete = user.permissions.includes('members.delete')
  const isOwn = user.id === member.id

  return (
    <div>
      {canEdit && !isOwn && <EditButton />}
      {canDelete && !isOwn && <DeleteButton />}
      {isOwn && <EditOwnProfileButton />}
    </div>
  )
}
```

### Clear Permission Components

```typescript
// ✅ Correct: Extracted permission components
interface Props {
  member: Member
  canEdit: boolean
  canDelete: boolean
  isOwnProfile: boolean
}

export default function MemberActions({
  member,
  canEdit,
  canDelete,
  isOwnProfile,
}: Props) {
  if (isOwnProfile) {
    return <OwnProfileActions member={member} />
  }

  return <OtherMemberActions member={member} canEdit={canEdit} canDelete={canDelete} />
}

function OwnProfileActions({ member }: { member: Member }) {
  return (
    <div className="flex gap-2">
      <EditProfileButton />
      <ChangePasswordButton />
    </div>
  )
}

interface OtherMemberActionsProps {
  member: Member
  canEdit: boolean
  canDelete: boolean
}

function OtherMemberActions({
  member,
  canEdit,
  canDelete,
}: OtherMemberActionsProps) {
  return (
    <div className="flex gap-2">
      {canEdit && <EditButton memberId={member.id} />}
      {canDelete && <DeleteButton memberId={member.id} />}
    </div>
  )
}
```

## Pattern 5: Error Handling

### Nested Error States

```typescript
// ❌ AI writes: Nested error handling
function DataDisplay() {
  const { data1, error1, loading1 } = useData1()
  const { data2, error2, loading2 } = useData2()

  if (loading1 || loading2) return <Spinner />
  if (error1) return <Error message={error1.message} />
  if (error2) return <Error message={error2.message} />
  if (!data1) return <NoData1 />
  if (!data2) return <NoData2 />

  return (
    <>
      <Display1 data={data1} />
      <Display2 data={data2} />
    </>
  )
}
```

### Independent Error Handling

```typescript
// ✅ Correct: Independent error handling
export default function DataDisplay() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Data1Section />
      <Data2Section />
    </div>
  )
}

function Data1Section() {
  const { data, error, isLoading } = useData1()

  return (
    <DataCard1
      data={data}
      error={error}
      isLoading={isLoading}
    />
  )
}

function Data2Section() {
  const { data, error, isLoading } = useData2()

  return (
    <DataCard2
      data={data}
      error={error}
      isLoading={isLoading}
    />
  )
}

// Each card handles its own states independently
interface DataCard1Props {
  data: Data1 | null
  error?: Error | null
  isLoading?: boolean
}

function DataCard1({ data, error, isLoading }: DataCard1Props) {
  if (isLoading) return <Card><Skeleton /></Card>
  if (error) return <Card><ErrorState error={error} /></Card>
  if (!data) return <Card><EmptyState /></Card>

  return (
    <Card>
      <Display1 data={data} />
    </Card>
  )
}
```

## Refactoring Guidelines

### Step 1: Identify Branches

Look for:
- Nested ternary operators
- Multiple if statements for UI rendering
- Conditional rendering based on multiple states
- Complex boolean logic

### Step 2: Extract Each Branch

Create separate components for:
- Loading states → `*Skeleton` components
- Error states → `*Error` components
- Empty states → `*Empty` components
- Success states → Main display components

### Step 3: Create Presentational Components

Make components that:
- Accept all states as props
- Handle conditional rendering internally
- Are easily testable with different prop combinations

### Step 4: Compose in Container

Page components should:
- Fetch data with custom hooks
- Pass data to presentational components
- Handle high-level routing logic

## Checklist: Branch Extraction

Before considering branch extraction complete, verify:

- [ ] Each conditional branch is in its own component
- [ ] Nesting depth is maximum 2 levels
- [ ] Each component has single responsibility
- [ ] Loading/error/empty/success states are separate components
- [ ] Easy to test each state independently
- [ ] Component names clearly indicate their purpose
- [ ] No complex boolean logic in JSX

## Quick Reference: Common Patterns

### Authentication
```typescript
if (!user) return <LoginPrompt />
return <AuthenticatedContent />
```

### Loading
```typescript
if (isLoading) return <Skeleton />
return <Content data={data} />
```

### Error
```typescript
if (error) return <ErrorState error={error} />
return <Content data={data} />
```

### Empty
```typescript
if (data.length === 0) return <EmptyState />
return <List items={data} />
```

### Permission
```typescript
if (canEdit) return <EditableView />
return <ReadOnlyView />
```

**Remember**: One component, one responsibility. Extract branches until each component is simple and focused.
