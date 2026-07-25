# Async React Patterns for Inertia

## 1. 最初に所有者を決める

非同期APIを選ぶ前に、更新対象を分類する。

| 更新対象 | 所有者 | 主なAPI |
| --- | --- | --- |
| Laravelが返すページデータ | Inertia | props、Partial Reload、Deferred Props |
| URL・ページ遷移 | Inertia | `Link`、`router.visit` |
| フォーム送信・検証 | Inertia | `useForm().withPrecognition()` |
| サーバーmutationの局所pending | Inertia + React adapter | `ActionButton`、`runInertiaAction` |
| controlled input・モーダル・focus | Reactの即時state | `useState`、通常イベント |
| 非緊急な局所レンダー | React | `useTransition` |
| optimistic UI | React | `useOptimistic` |
| コード分割・Suspense対応source | React | `Suspense`、`use()` |

## 2. Laravelページデータ

### 通常props

初期操作に必要なデータはControllerから通常propsで渡す。

```php
return Inertia::render('Stocks', [
    'stocks' => $listStocks->execute($filters),
    'filters' => $filters,
]);
```

```tsx
export default function Stocks({ stocks, filters }: StocksPageProps) {
  return <StockResults stocks={stocks} filters={filters} />;
}
```

通常propsをPromiseへ包み直して `use()` で読む必要はない。Inertiaがページpropsの
取得、キャンセル、ページ交換、progressを所有している。

### Deferred Props

初期表示に不要で重いデータは、バックエンドで集約単位を分ける。

```php
$overview = $overviewUseCase->execute($userId);

return Inertia::render('Dashboard', [
    ...$overview->toArray(),
    'dashboardDetails' => Inertia::defer(
        fn (): array => $detailsUseCase->execute($userId)->toArray(),
        'dashboard-details',
    ),
]);
```

```tsx
import { Deferred } from "@inertiajs/react";

function Dashboard({ stats, dashboardDetails }: DashboardPageProps) {
  return (
    <>
      <Stats stats={stats} />
      <Deferred data="dashboardDetails" fallback={<DashboardDetailsSkeleton />}>
        {dashboardDetails ? <DashboardDetails details={dashboardDetails} /> : null}
      </Deferred>
    </>
  );
}
```

ルール:

- 初期画面の判断・操作に必要なデータは通常propsに残す。
- 同じ集約UseCaseを複数のDeferred closureから実行しない。
- Deferred未取得はoptionalまたはnullableなTypeScript型で表す。
- fallbackは実レイアウトに近い寸法と、`role="status"` などの読み込み状態を持つ。

## 3. Partial Reload

検索、フィルタ、ページネーションではページ全体の独自fetchを作らず、
InertiaのPartial Reloadを優先する。

```tsx
router.get(
  stocksIndex.url(),
  { q, market },
  {
    only: ["stocks", "filters"],
    preserveState: true,
    replace: true,
  },
);
```

送信中表示は、フォームなら `processing`、標準Linkなら `data-loading`、
独立した複数操作なら操作ごとのstateを使用する。1つの共有pending flagで
検索とクリアなど別操作のラベルを混在させない。

## 4. InertiaフォームとPrecognition

```tsx
const form = useForm({
  email: "",
  password: "",
}).withPrecognition(login().method, login.url());

function submit(event: React.FormEvent) {
  event.preventDefault();
  form.submit({
    preserveScroll: true,
  });
}

return (
  <form onSubmit={submit}>
    <Input
      value={form.data.email}
      onChange={(event) => form.setData("email", event.target.value)}
      onBlur={() => form.validate("email")}
      aria-invalid={form.errors.email ? "true" : undefined}
    />
    {form.errors.email ? <p role="alert">{form.errors.email}</p> : null}
    <button type="submit" disabled={form.processing}>
      {form.processing ? "送信中..." : "送信"}
    </button>
  </form>
);
```

`form.submit()` を `startTransition` で包まない。Inertiaが提供する
`processing`、`errors`、`wasSuccessful`、キャンセル処理を正として扱う。
`useActionState` は、Inertiaを使わないReact-owned formに限って検討する。

## 5. 通常GETナビゲーション

```tsx
import { Link } from "@inertiajs/react";

<Link
  href={stockShow.url(stock.id)}
  className="transition-opacity data-[loading]:opacity-70"
>
  詳細
</Link>;
```

標準 `Link` はSPA visit、修飾キー、prefetch、Partial Reload、progress、
`data-loading` を備える。単純なGETのopacity表示だけを理由に
`InertiaActionLink` を使わない。

`InertiaActionLink` を使えるのは次の場合だけ。

- Reactから `isPending` を参照する。
- `ActionScope` 配下でpendingを共有する。
- pending中の再操作を明示的に抑止する。
- `ActionScope onError` へ例外を流す。
- 標準Linkでは表せないaction契約がある。

## 6. mutation

サーバー状態を変更する操作は `ActionButton` とInertia action adapterを使う。

```tsx
const removeAction = inertiaAction((visitOptions) => {
  router.delete(destroy.url(item.id), {
    ...visitOptions,
    preserveScroll: true,
  });
});

<ActionButton action={removeAction} pendingLabel="削除中...">
  削除
</ActionButton>;
```

adapterはvisitの完了、失敗、キャンセルまでPromiseを維持し、局所的な
`isPending` と接続する。ただしInertiaのpage swap自体をConcurrent Transitionに
するものではない。

### await後のReact state更新

```tsx
<ActionButton
  action={async ({ transition }) => {
    await save();
    transition(() => setSaved(true));
  }}
>
  保存
</ActionButton>
```

`await` 後のstate更新だけを追加のTransitionへ包む。Inertia送信そのものを
二重にTransition化しない。

## 7. 即時ローカルUI

モーダル、メニュー、controlled input、focus、selectionは即時更新する。

```tsx
<Button type="button" onClick={() => setOpen(true)}>
  ダイアログを開く
</Button>

<Input value={query} onChange={(event) => setQuery(event.target.value)} />
```

これらをaction propやTransitionへ一律に変換しない。

## 8. React-owned Transitionとoptimistic UI

React内だけで完結し、結果を待つ間も現在のUIを操作可能にしたい非緊急更新には
`useTransition` を使える。

```tsx
const [isPending, startTransition] = useTransition();

function selectTab(tab: Tab) {
  startTransition(() => {
    setSelectedTab(tab);
  });
}
```

サーバーmutationの結果を先に見せ、失敗時に元へ戻せる操作では
`useOptimistic` を検討する。

```tsx
const [optimisticItems, removeOptimistic] = useOptimistic(
  items,
  (current, removedId: number) => current.filter((item) => item.id !== removedId),
);

const removeAction = async () => {
  removeOptimistic(item.id);
  await destroyItem(item.id);
};
```

業務上の不可逆操作や、成功が不確実で誤表示の影響が大きい操作には使わない。

## 9. Suspense

Suspenseを使う対象:

- `React.lazy` によるコード分割
- 安定したPromiseキャッシュを持つSuspense対応データソース
- Reactが所有する非同期レンダー境界

```tsx
const AnalyticsPanel = lazy(() => import("./AnalyticsPanel"));

<Suspense fallback={<AnalyticsPanelSkeleton />}>
  <AnalyticsPanel />
</Suspense>;
```

`use()` で読むPromiseはレンダーごとに生成しない。キャッシュの所有者、無効化、
失敗時の再試行が明確な場合に限る。Laravel由来データにはInertia Deferred Propsを
優先する。

## 10. loadingとerror

`isPending` はTransitionの進行状態だけを示し、errorを表さない。

| 状況 | loading | error |
| --- | --- | --- |
| Inertiaフォーム | `form.processing` | `form.errors` |
| Inertia Link | `data-loading` | visit callback / flash |
| Action adapter | `isPending` | action内 / `ActionScope onError` |
| Deferred Props | `<Deferred fallback>` | 局所Error Boundary、再試行UI |
| React Suspense source | `<Suspense fallback>` | Error Boundary |

共通エラー処理のためにアプリ全体を1つの `ActionScope` で囲まない。
関連する操作だけを最小のscopeへまとめる。
