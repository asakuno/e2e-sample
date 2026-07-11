# Component Design Patterns for Async React

汎用コンポーネントにAsync Reactパターンを組み込み、使う側が意識せずとも最適なUXを提供する設計。

## 設計原則

1. **トランジションはコンポーネント内部に閉じ込める** - 使う側は `action` propを渡すだけ
2. **ローディング表示はコンポーネントの責務** - `isPending` で自動制御
3. **楽観的更新はコンポーネントが管理** - `useOptimistic` で即座の反映
4. **Suspenseバウンダリはデータ消費コンポーネントの親に配置** - 宣言的な非同期UI

## 1. 汎用Buttonコンポーネント（トランジション組み込み）

ボタンを押した時の非同期処理を、自動的にトランジションにする。

```tsx
import { useTransition } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  action: () => Promise<void>;
  children: React.ReactNode;
  variant?: string;
}

function Button({ action, children, variant = "default", ...props }: ButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await action();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={buttonVariants({ variant })}
      {...props}
    >
      {isPending ? <Spinner /> : children}
    </button>
  );
}
```

### 使用例

```tsx
// 使う側はトランジションを一切意識しない
interface TodoItemProps {
  id: string;
}

function TodoItem({ id }: TodoItemProps) {
  async function completeAction() {
    await api.completeTodo(id);
    revalidate();
  }

  return (
    <div>
      <span>{todo.title}</span>
      <Button action={completeAction}>Complete</Button>
    </div>
  );
}
```

## 2. 汎用SearchInput（楽観的更新 + スピナー）

入力は即座に反映しつつ、バックグラウンドで検索処理を実行する。

```tsx
import { startTransition, useOptimistic } from "react";

interface SearchInputProps {
  value: string;
  changeAction: (value: string) => void;
  placeholder?: string;
}

function SearchInput({ value, changeAction, placeholder = "Search..." }: SearchInputProps) {
  const [inputValue, setInputValue] = useOptimistic(value);
  const isPending = inputValue !== value;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    startTransition(async () => {
      setInputValue(newValue);
      await changeAction(newValue);
    });
  }

  return (
    <div className="relative">
      <input type="text" value={inputValue} onChange={handleChange} placeholder={placeholder} />
      {isPending && <Spinner className="absolute right-2 top-1/2 -translate-y-1/2" />}
    </div>
  );
}
```

### 使用例

```tsx
function Home() {
  const router = useRouter();
  const search = router.search.q || "";

  function searchAction(value: string) {
    router.setParams("q", value);
  }

  return (
    <>
      <SearchInput value={search} changeAction={searchAction} />
      <Suspense fallback={<SkeletonList />}>
        <ResultList query={search} />
      </Suspense>
    </>
  );
}
```

## 3. 汎用TabList（楽観的タブ切替）

タブは即座に切り替わりつつ、コンテンツのロードはバックグラウンドで行う。

```tsx
import { startTransition, useOptimistic } from "react";

interface Tab {
  value: string;
  label: string;
}

interface TabListProps {
  activeTab: string;
  tabs: Tab[];
  changeAction: (value: string) => void;
  children: React.ReactNode;
}

function TabList({ activeTab, tabs, changeAction, children }: TabListProps) {
  const [optimisticTab, setActiveTab] = useOptimistic(activeTab);
  const isPending = optimisticTab !== activeTab;

  function onTabClick(newValue: string) {
    startTransition(async () => {
      setActiveTab(newValue);
      await changeAction(newValue);
    });
  }

  return (
    <div>
      <div role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={optimisticTab === tab.value}
            onClick={() => onTabClick(tab.value)}
            className={`tab ${optimisticTab === tab.value ? "active" : ""}`}
          >
            <ShimmerWrapper isPending={isPending && optimisticTab === tab.value}>
              {tab.label}
            </ShimmerWrapper>
          </button>
        ))}
      </div>
      <div role="tabpanel" className={isPending ? "opacity-70" : ""}>
        {children}
      </div>
    </div>
  );
}
```

### 使用例

```tsx
function Dashboard() {
  const router = useRouter();
  const tab = router.search.tab || "all";

  function tabAction(value: string) {
    router.setParams("tab", value);
  }

  const tabs: Tab[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <TabList activeTab={tab} tabs={tabs} changeAction={tabAction}>
      <Suspense fallback={<SkeletonList />}>
        <ItemList tab={tab} />
      </Suspense>
    </TabList>
  );
}
```

## 4. Suspenseバウンダリ付きリスト

データフェッチとSuspenseを組み合わせた宣言的なリスト表示。

```tsx
import { Suspense, use } from "react";

interface Item {
  id: string;
  name: string;
}

// データ取得コンポーネント（Suspenseの中で使う）
interface ItemListProps {
  query: string;
}

function ItemList({ query }: ItemListProps) {
  const items = use(getItems(query));

  if (items.length === 0) {
    return <EmptyState message="No items found" />;
  }

  return (
    <ul>
      {items.map((item: Item) => (
        <li key={item.id}>
          <ItemCard item={item} />
        </li>
      ))}
    </ul>
  );
}

// フォールバック（スケルトンUI）
interface ItemListSkeletonProps {
  count?: number;
}

function ItemListSkeleton({ count = 5 }: ItemListSkeletonProps) {
  return (
    <ul>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="animate-pulse h-16 bg-gray-200 rounded" />
        </li>
      ))}
    </ul>
  );
}

// 統合コンポーネント
interface ItemSectionProps {
  query: string;
}

function ItemSection({ query }: ItemSectionProps) {
  return (
    <Suspense fallback={<ItemListSkeleton />}>
      <ItemList query={query} />
    </Suspense>
  );
}
```

## 5. フォームコンポーネント（useActionState）

フォームの送信とバリデーションをトランジション内で処理する。

```tsx
import { useActionState } from "react";

interface LoginFormState {
  success: boolean;
  error: string | null;
}

function LoginForm() {
  const [state, submitAction, isPending] = useActionState<LoginFormState, FormData>(
    async (prevState, formData) => {
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;

      try {
        await login(username, password);
        return { success: true, error: null };
      } catch (e) {
        return { success: false, error: (e as Error).message };
      }
    },
    { success: false, error: null },
  );

  return (
    <form action={submitAction}>
      <div>
        <label htmlFor="username">Username</label>
        <input id="username" name="username" required />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />
      </div>
      {state.error && <p className="text-red-500">{state.error}</p>}
      <Button action={() => {}} type="submit" disabled={isPending}>
        {isPending ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}
```

## 6. 楽観的トグルボタン（CompleteButton）

トグル操作を即座に反映し、API呼び出しはバックグラウンドで処理する。

```tsx
import { startTransition, useOptimistic } from "react";

interface CompleteButtonProps {
  complete: boolean;
  action: () => Promise<void>;
}

function CompleteButton({ complete, action }: CompleteButtonProps) {
  const [optimisticComplete, setOptimisticComplete] = useOptimistic(complete);

  function clickAction() {
    startTransition(async () => {
      setOptimisticComplete(!optimisticComplete);
      await action();
    });
  }

  return (
    <Button action={clickAction}>{optimisticComplete ? <CheckIcon /> : <CircleIcon />}</Button>
  );
}
```

## 7. ページネーション付きリスト

Suspense + トランジションでちらつきのないページ切り替え。

```tsx
import { Suspense, use, startTransition } from "react";

interface PageData {
  items: Item[];
  totalPages: number;
}

interface PaginatedListProps {
  page: number;
  setPage: (page: number) => void;
}

function PaginatedList({ page, setPage }: PaginatedListProps) {
  return (
    <div>
      <Suspense fallback={<ListSkeleton />}>
        <PageContent page={page} setPage={setPage} />
      </Suspense>
    </div>
  );
}

interface PageContentProps {
  page: number;
  setPage: (page: number) => void;
}

function PageContent({ page, setPage }: PageContentProps) {
  const data = use(fetchPage(page));
  // data = { items: [...], totalPages: N }
  // use() の戻り値から直接 totalPages を参照する（親stateへのレンダー中更新は禁止）
  return (
    <>
      <ul>
        {data.items.map((item: Item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      <Pagination
        page={page}
        totalPages={data.totalPages}
        onPageChange={(newPage: number) => {
          startTransition(() => {
            setPage(newPage);
          });
        }}
      />
    </>
  );
}
```

**ポイント**:

- `setPage` をトランジション内で呼ぶため、ページ切り替え時にフォールバックが表示されない
- 初回表示時のみフォールバック（スケルトン）が表示される
- ページ切り替え中は既存のリストが表示され続ける
- `totalPages` は `use()` で取得した `data` オブジェクトから直接参照する。レンダー中に親の `setState` を呼んで `totalPages` を渡すパターンは禁止

## 8. ErrorBoundary + Suspense パターン

データフェッチのエラーを宣言的にハンドリングする。ErrorBoundaryはSuspenseの外側に配置する。

```tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface DataSectionProps {
  query: string;
}

function DataSection({ query }: DataSectionProps) {
  return (
    <ErrorBoundary
      fallback={<ErrorMessage message="データの取得に失敗しました" />}
      resetKeys={[query]}
    >
      <Suspense fallback={<SkeletonList />}>
        <DataList query={query} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**ポイント**:

- `ErrorBoundary` > `Suspense` > データコンポーネントの順で配置
- `resetKeys` でクエリ変更時にエラー状態をリセットする
- action内のエラーは `try/catch` で処理し、ErrorBoundaryは`use()`のPromiseリジェクトをキャッチする

## 組み合わせの全体像

```
┌─ App ─────────────────────────────────┐
│  SearchInput (useOptimistic)          │
│  TabList (useOptimistic)              │
│  ┌─ Suspense ───────────────────────┐ │
│  │  fallback={<SkeletonList />}     │ │
│  │  ┌─ DataList ──────────────────┐ │ │
│  │  │  use(getData(query))        │ │ │
│  │  │  ┌─ ViewTransition ───────┐ │ │ │
│  │  │  │  ListItem              │ │ │ │
│  │  │  │  CompleteButton        │ │ │ │
│  │  │  │  (useOptimistic)       │ │ │ │
│  │  │  └────────────────────────┘ │ │ │
│  │  └─────────────────────────────┘ │ │
│  └──────────────────────────────────┘ │
└───────────────────────────────────────┘
```

- **SearchInput**: 入力は即座に反映、検索はバックグラウンド
- **TabList**: タブは即座に切替、コンテンツロードはバックグラウンド
- **Suspense**: 初回のみフォールバック表示、トランジション中は既存UI維持
- **DataList**: `use()` でデータ読み取り、Suspenseと連携
- **CompleteButton**: 楽観的更新で即座にUI反映
- **ViewTransition**: アニメーション統合
