# Component Design for Inertia + Async React

## 設計原則

1. UIを作る前に、データ・通信・stateの所有者を決める。
2. ページコンポーネントはInertia propsとUseCase由来データを組み立てる。
3. 表示コンポーネントは、Inertia routerやフォームを知らなくてもテストできる形を優先する。
4. loadingとerrorは、それを提供するライフサイクルのAPIで表現する。
5. ReactのTransition、optimistic UI、SuspenseはReact-ownedな境界に限定する。
6. 即時ローカルUIへaction abstractionを持ち込まない。

## 1. Link・ActionButton・Buttonの選択

| 操作 | コンポーネント | pending |
| --- | --- | --- |
| 通常GETナビゲーション | Inertia `Link` | `data-loading` |
| サーバーmutation | `ActionButton` | `isPending` / `data-pending` |
| pending共有が必要なGET | `InertiaActionLink` | `ActionScope` |
| モーダル・メニュー開閉 | 通常の `Button` | 原則不要 |
| controlled input | `Input` + `onChange` | 入力自体は即時 |

### GET Link

```tsx
function StockLink({ stock }: { stock: StockListItem }) {
  return (
    <Link
      href={stockShow.url(stock.id)}
      className="transition-opacity data-[loading]:opacity-70"
    >
      {stock.symbol}
    </Link>
  );
}
```

### mutation

コンテナがInertia actionを組み立て、表示コンポーネントへ渡す。

```tsx
function WatchlistContainer({ item }: { item: WatchlistItem }) {
  const removeAction = inertiaAction((visitOptions) => {
    router.delete(destroy.url(item.id), {
      ...visitOptions,
      preserveScroll: true,
    });
  });

  return <WatchlistRow item={item} removeAction={removeAction} />;
}

function WatchlistRow({
  item,
  removeAction,
}: {
  item: WatchlistItem;
  removeAction: ActionCallback;
}) {
  return (
    <ActionButton action={removeAction} pendingLabel="削除中...">
      {item.stock.symbol}を削除
    </ActionButton>
  );
}
```

### 即時ローカルUI

```tsx
<Button type="button" onClick={() => setDialogOpen(true)}>
  編集
</Button>
```

モーダル、メニュー、ポップオーバー、focus、selection、controlled inputを
`ActionButton` やTransitionへ変換しない。

## 2. Inertiaフォーム

ページまたはfeature containerが `useForm().withPrecognition()` を所有し、
表示コンポーネントへ必要な値とイベントだけを渡す。

```tsx
function LoginPage() {
  const form = useForm({
    email: "",
    password: "",
  }).withPrecognition(login().method, login.url());

  function submit(event: React.FormEvent) {
    event.preventDefault();
    form.submit();
  }

  return (
    <LoginForm
      data={form.data}
      errors={form.errors}
      processing={form.processing}
      onEmailChange={(email) => form.setData("email", email)}
      onEmailBlur={() => form.validate("email")}
      onSubmit={submit}
    />
  );
}
```

```tsx
type LoginFormProps = {
  data: { email: string; password: string };
  errors: Partial<Record<"email" | "password", string>>;
  processing: boolean;
  onEmailChange: (email: string) => void;
  onEmailBlur: () => void;
  onSubmit: React.FormEventHandler;
};

function LoginForm({
  data,
  errors,
  processing,
  onEmailChange,
  onEmailBlur,
  onSubmit,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <Input
        value={data.email}
        onChange={(event) => onEmailChange(event.target.value)}
        onBlur={onEmailBlur}
        aria-invalid={errors.email ? "true" : undefined}
      />
      {errors.email ? <p role="alert">{errors.email}</p> : null}
      <button type="submit" disabled={processing}>
        {processing ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
```

`form.submit()` を `startTransition` で包まず、送信状態とエラーのsource of truthを
Inertiaに保つ。

## 3. Deferredセクション

初期表示に必要な概要と、後から表示する詳細をprops型で分ける。

```tsx
interface DashboardPageProps {
  stats: DashboardStat[];
  latestAnalysisAt: string | null;
  dashboardDetails?: DashboardDetails | undefined;
}
```

```tsx
function Dashboard({ stats, dashboardDetails }: DashboardPageProps) {
  return (
    <div className="grid gap-6">
      <DashboardStats stats={stats} />
      <Deferred data="dashboardDetails" fallback={<DashboardDetailsSkeleton />}>
        {dashboardDetails ? <DashboardDetailsView details={dashboardDetails} /> : null}
      </Deferred>
    </div>
  );
}
```

### skeletonの要件

- 実コンテンツと近い高さ・列数にする。
- レイアウトシフトを抑える。
- `role="status"`、`aria-busy="true"`、読み込みラベルを付ける。
- 装飾用の骨組みは `aria-hidden="true"` にする。
- 初期propsで操作できる領域を覆わない。

```tsx
function DashboardDetailsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="詳細を読み込み中">
      <span className="sr-only">詳細を読み込み中</span>
      <div aria-hidden="true" className="h-72 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
```

## 4. 検索・フィルタ・ページネーション

controlled inputは即時更新し、送信時にInertia Partial Reloadを使う。

```tsx
function StockSearchForm({ initialFilters }: Props) {
  const [query, setQuery] = useState(initialFilters.q);
  const [searchProcessing, setSearchProcessing] = useState(false);
  const [resetProcessing, setResetProcessing] = useState(false);

  function search() {
    setSearchProcessing(true);
    router.get(
      stocksIndex.url(),
      { q: query },
      {
        only: ["stocks", "filters"],
        preserveState: true,
        replace: true,
        onFinish: () => setSearchProcessing(false),
      },
    );
  }

  return (
    <>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} />
      <Button onClick={search} disabled={searchProcessing}>
        {searchProcessing ? "検索中..." : "検索"}
      </Button>
      <Button disabled={resetProcessing}>クリア</Button>
    </>
  );
}
```

独立した操作を1つのpending flagで表さない。検索中にクリアのラベルが変わるなど、
操作間のstate汚染を防ぐ。

ページネーションの通常GETは標準 `Link` を使う。

```tsx
<Link
  href={nextUrl}
  only={["stocks"]}
  preserveScroll
  className="data-[loading]:opacity-70"
>
  次へ
</Link>
```

## 5. React-owned Transition

Reactの局所stateだけを更新し、レンダーが重い場合にTransitionを検討する。

```tsx
function LocalAnalyticsTabs() {
  const [tab, setTab] = useState("summary");
  const [isPending, startTransition] = useTransition();

  function selectTab(nextTab: string) {
    startTransition(() => setTab(nextTab));
  }

  return (
    <>
      <TabList value={tab} onValueChange={selectTab} />
      <section aria-busy={isPending || undefined}>
        <HeavyLocalChart tab={tab} />
      </section>
    </>
  );
}
```

URLやLaravel propsが変わるタブはInertia navigationとして設計する。
Inertiaのpage swapをConcurrent Transitionでバックグラウンドレンダーできるとは
説明しない。

## 6. Suspense境界

Suspenseを使用できるのは、`React.lazy`、安定したPromiseキャッシュを持つ
Suspense対応source、React-owned非同期レンダーである。

```tsx
const HeavyEditor = lazy(() => import("./HeavyEditor"));

function EditorSection() {
  return (
    <ErrorBoundary fallback={<EditorError />}>
      <Suspense fallback={<EditorSkeleton />}>
        <HeavyEditor />
      </Suspense>
    </ErrorBoundary>
  );
}
```

Laravel由来データでは、独自fetch + Suspenseを作る前にDeferred Propsを選ぶ。

## 7. Error設計

- フィールド検証: `form.errors` と `role="alert"`
- mutationの業務エラー: action内の局所メッセージ
- 関連操作の共通エラー: 最小範囲の `ActionScope onError`
- Suspense sourceの予期しない例外: Error Boundary
- Deferred失敗: ページ概要を残した局所的な再試行UI

`isPending` はerrorを表さない。pendingが解除されたことを成功とみなさない。

## 8. テスト観点

- 通常時、空状態、validation error
- `processing` / `data-loading` / `isPending` の正しい所有者
- Deferred中も初期propsの内容が見えて操作可能
- Deferred完了後の詳細表示
- 失敗後に操作が再び可能
- 複数操作のpending表示が相互汚染しない
- persistent layout配下のDOM・ローカルstateがページ遷移後も維持される
