# Async React Patterns Reference

## 1. Transitions (useTransition / startTransition)

トランジションは、ステート更新を「緊急でない」とマークする仕組み。トランジション中にSuspenseが発生しても、**既存のUIを維持しつつバックグラウンドで新しいUIを準備**する。

### useTransition - コンポーネント内で使う場合

```tsx
import { useTransition } from "react";

interface ButtonProps {
  action: () => Promise<void>;
  children: React.ReactNode;
}

function Button({ action, children }: ButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await action();
        })
      }
      disabled={isPending}
    >
      {isPending ? <Spinner /> : children}
    </button>
  );
}
```

**ポイント**:

- `isPending` でローディング状態を取得できる
- `startTransition` のコールバックは `async` 関数にできる（React 19以降）
- トランジション中でもUIはインタラクティブなまま
- `e.stopPropagation()` は不要。イベントバブリングを不必要に止めない

### startTransition - コンポーネント外で使う場合

```tsx
import { startTransition } from "react";

function navigate(url: string) {
  startTransition(() => {
    setRouterState({ url });
  });
}
```

**使い分け**:

- `isPending` が必要 → `useTransition()`
- 単にトランジションにしたいだけ → `startTransition()`

## 2. Suspense

Suspenseバウンダリを作り、非同期処理の完了を待つ間のフォールバックUIを宣言的に定義する。

### 基本パターン

```tsx
import { Suspense } from "react";

function App() {
  return (
    <Suspense fallback={<SkeletonList />}>
      <DataList />
    </Suspense>
  );
}
```

### ネストしたSuspense

```tsx
function Dashboard() {
  return (
    <div>
      {/* ヘッダーは即座に表示 */}
      <Header />
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        <MainContent />
      </Suspense>
    </div>
  );
}
```

### Suspense + Transition の相互作用

トランジション中にSuspenseが発生した場合:

- **トランジションなし**: 即座にフォールバックを表示
- **トランジションあり**: 既存のUIを表示し続け、準備ができたら切り替え

```tsx
// トランジション中はフォールバックが表示されず、既存のリストが維持される
function Home() {
  return (
    <Suspense fallback={<FallbackList />}>
      <LessonList tab={tab} search={search} />
    </Suspense>
  );
}
```

## 3. Optimistic Updates (useOptimistic)

非同期処理の完了を待たず、UIを即座に更新する。処理が完了すると実際の値で置き換わる。

### トグルボタン

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

  return <Button action={clickAction}>{optimisticComplete ? <CheckIcon /> : <EmptyIcon />}</Button>;
}
```

**ポイント**:

- `useOptimistic(actualValue)` は現在の楽観値を返す
- トランジション中は楽観値が表示される
- トランジション完了後、`actualValue` が更新されると楽観値はリセットされる
- `optimisticValue !== actualValue` でpending状態を検出できる

### 検索入力

```tsx
import { startTransition, useOptimistic } from "react";

interface SearchInputProps {
  value: string;
  changeAction: (value: string) => void;
}

function SearchInput({ value, changeAction }: SearchInputProps) {
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
    <div>
      <input value={inputValue} onChange={handleChange} />
      {isPending && <Spinner />}
    </div>
  );
}
```

### タブ切り替え

```tsx
import { startTransition, useOptimistic } from "react";

interface TabListProps {
  activeTab: string;
  changeAction: (value: string) => void;
  children: React.ReactNode;
}

function TabList({ activeTab, changeAction, children }: TabListProps) {
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
            key={tab}
            role="tab"
            aria-selected={optimisticTab === tab}
            onClick={() => onTabClick(tab)}
            className={isPending ? "opacity-70" : ""}
          >
            {tab}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
```

## 4. Action Props Pattern

コンポーネントが `onClick` ではなく `action` propを受け取り、内部でトランジションを管理するパターン。

### 従来のパターン vs Action Propsパターン

```tsx
// ❌ 従来: onClick を受け取る
interface ButtonOldProps {
  onClick: () => void;
  children: React.ReactNode;
}

function Button({ onClick, children }: ButtonOldProps) {
  return <button onClick={onClick}>{children}</button>;
}
// 使う側が startTransition を意識する必要がある
<Button onClick={() => startTransition(() => doSomething())} />;

// ✅ Action Props: action を受け取り内部でトランジション化
type ActionContext = {
  transition: (callback: () => void) => void;
};

type ActionCallback = (context: ActionContext) => void | Promise<void>;

interface ButtonProps {
  action: ActionCallback;
  children: React.ReactNode;
}

function Button({ action, children }: ButtonProps) {
  const [isPending, startTransition] = useTransition();
  const transition: ActionContext["transition"] = (callback) => {
    startTransition(callback);
  };

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await action({ transition });
        })
      }
      disabled={isPending}
    >
      {isPending ? <Spinner /> : children}
    </button>
  );
}
// 使う側はトランジションを意識しなくてよい
<Button action={doSomething}>Save</Button>;
```

**設計のポイント**:

- **汎用コンポーネント**にトランジションを組み込むことで、使う側は意識せず自動的にAsync Reactの恩恵を受ける
- ローディング表示もコンポーネント内で完結する
- Action propの命名: `action`, `changeAction`, `submitAction` 等
- action内で `await` 後にstate更新する場合は、action context の `transition` helperで追加のトランジションに包む

### Action context と ActionScope

`await` 後のstate更新はReact公式の制約により追加の `startTransition` が必要になるため、actionには `transition` helperを渡す。toast / Sentry / 共通ログなど操作横断のエラー通知は `ActionScope onError` に集約し、個別のバリデーションや業務エラーはaction内で処理する。

```tsx
type ActionContext = {
  transition: (callback: () => void) => void;
};

type ActionCallback = (context: ActionContext) => void | Promise<void>;

function SaveSection() {
  const [saved, setSaved] = useState(false);

  return (
    <ActionScope onError={(error) => reportActionError(error)}>
      <ActionButton
        action={async ({ transition }) => {
          await save();

          transition(() => {
            setSaved(true);
          });
        }}
      >
        Save
      </ActionButton>
      {saved && <p>Saved</p>}
    </ActionScope>
  );
}
```

## 5. Data Fetching (Suspense + use())

### Suspense対応のキャッシュ付きデータフェッチ

```tsx
const cache = new Map<string, Promise<unknown>>();

function getData<T>(query: string): Promise<T> {
  const key = JSON.stringify(query);
  if (cache.has(key)) {
    return cache.get(key) as Promise<T>;
  }
  const promise = fetch(`/api/data?q=${query}`).then((r) => r.json());
  cache.set(key, promise);
  return promise;
}

function revalidate() {
  cache.clear();
}
```

### use() フックでデータを読む

```tsx
import { use } from "react";

interface Item {
  id: string;
  name: string;
}

interface DataListProps {
  query: string;
}

function DataList({ query }: DataListProps) {
  const data = use(getData<Item[]>(query));

  if (data.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### ミューテーション後のキャッシュ無効化

```tsx
async function updateItem(id: string, data: Record<string, unknown>) {
  await fetch(`/api/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  revalidate(); // キャッシュをクリア
}
```

## 6. ViewTransition

画面遷移やリスト変更時にCSSアニメーションを統合する。

### リストアイテムのアニメーション

```tsx
import { ViewTransition } from "react";

interface Item {
  id: string;
  name: string;
}

interface AnimatedListProps {
  items: Item[];
}

function AnimatedList({ items }: AnimatedListProps) {
  return (
    <ViewTransition key="list" default="none" enter="auto" exit="auto">
      <ul>
        {items.map((item) => (
          <ViewTransition key={item.id}>
            <li>{item.name}</li>
          </ViewTransition>
        ))}
      </ul>
    </ViewTransition>
  );
}
```

### ページ遷移のアニメーション

```tsx
function AppRouter() {
  const { url } = useRouter();

  return (
    <>
      {url === "/" && (
        <ViewTransition key={url} default="none" enter="auto" exit="auto">
          <HomePage />
        </ViewTransition>
      )}
      {url === "/about" && (
        <ViewTransition key={url} default="none" enter="auto" exit="auto">
          <AboutPage />
        </ViewTransition>
      )}
    </>
  );
}
```

**ポイント**:

- `default="none"` で通常のレンダリングではアニメーションなし
- `enter="auto"` / `exit="auto"` でトランジション時のみアニメーション
- `key` propでViewTransitionの識別を行う
- まだ安定版には含まれていない（experimental）

## 7. Prefetching

ナビゲーション前にデータをプリロードすることで、遷移時のローディングを最小化する。

```tsx
async function submitAction() {
  await login(username, password);
  await prefetchData(); // ナビゲーション前にデータを取得
  router.navigate("/");
}

function prefetchData() {
  // キャッシュにデータをプリロード
  return getData("initial");
}
```

## 8. Loading States (isPending)

### isPending による状態表示

```tsx
interface ButtonProps {
  action: () => Promise<void>;
  children: React.ReactNode;
}

function Button({ action, children }: ButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await action();
        })
      }
      className={isPending ? "opacity-50" : ""}
      disabled={isPending}
    >
      {isPending ? <Spinner /> : children}
    </button>
  );
}
```

### optimistic !== actual による状態検出

```tsx
interface SearchInputProps {
  value: string;
  changeAction: (value: string) => void;
}

function SearchInput({ value, changeAction }: SearchInputProps) {
  const [inputValue, setInputValue] = useOptimistic(value);
  const isPending = inputValue !== value;

  return (
    <div className="relative">
      <input value={inputValue} onChange={handleChange} />
      {isPending && <Spinner className="absolute right-2 top-2" />}
    </div>
  );
}
```

### shimmer/skeleton エフェクト

```tsx
interface ButtonShimmerProps {
  isPending: boolean;
  children: React.ReactNode;
}

function ButtonShimmer({ isPending, children }: ButtonShimmerProps) {
  return <div className={isPending ? "animate-pulse opacity-70" : ""}>{children}</div>;
}
```

## 9. useActionState (フォーム)

```tsx
import { useActionState } from "react";

interface ContactFormState {
  error: string | null;
  success: boolean;
}

function ContactForm() {
  const [state, submitAction, isPending] = useActionState<ContactFormState, FormData>(
    async (previousState, formData) => {
      const name = formData.get("name") as string;
      const email = formData.get("email") as string;
      const result = await submitContact({ name, email });
      if (result.error) {
        return { error: result.error, success: false };
      }
      return { success: true, error: null };
    },
    { error: null, success: false },
  );

  return (
    <form action={submitAction}>
      <input name="name" required />
      <input name="email" type="email" required />
      {state.error && <p className="text-red-500">{state.error}</p>}
      {state.success && <p className="text-green-500">Sent!</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? <Spinner /> : "Submit"}
      </button>
    </form>
  );
}
```

## 10. Error Handling

### ErrorBoundary + Suspense パターン

データフェッチのエラー（`use()` のPromiseリジェクト）を宣言的にハンドリングする。

```tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface DataSectionProps {
  query: string;
}

function DataSection({ query }: DataSectionProps) {
  return (
    <ErrorBoundary
      fallback={<div className="text-red-500">データの取得に失敗しました</div>}
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

- `ErrorBoundary` は `Suspense` の外側に配置する
- `resetKeys` でプロップ変更時にエラー状態を自動リセットする
- `react-error-boundary` ライブラリが便利だが、クラスコンポーネントで自作も可

### action内のtry/catch パターン

ミューテーション系のエラーは `useActionState` やaction prop内で `try/catch` を使う。

```tsx
interface SaveButtonProps {
  action: () => Promise<void>;
  children: React.ReactNode;
}

function SaveButton({ action, children }: SaveButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        onClick={() =>
          startTransition(async () => {
            try {
              await action();
              setError(null);
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
        disabled={isPending}
      >
        {isPending ? <Spinner /> : children}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </>
  );
}
```

**使い分け**:

- **データ読み取り（`use()`）のエラー** → `ErrorBoundary` で宣言的にキャッチ
- **個別ミューテーション（action）のエラー** → action内の `try/catch` でフォームエラーや業務エラーをステート管理
- **操作横断のエラー通知** → `ActionScope onError` でtoast / Sentry / 共通ログを集約
