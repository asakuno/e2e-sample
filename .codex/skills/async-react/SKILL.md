---
name: async-react
description: |
  Laravel + Inertia.js v2 + React 19で、データ取得、フォーム、ナビゲーション、
  mutation、ローディング、楽観的更新、Suspense境界を設計・実装するためのスキル。
  Inertiaが所有する通信ライフサイクルとReactが所有する局所状態を分けて扱う。
  使用タイミング: Reactコンポーネントの作成・変更、非同期UI、フォーム、検索、
  ページネーション、Deferred Props、Transition、Suspense、Action Propsの検討時。
  使用しない場面: React以外、Server Components固有実装、スタイリングだけの変更。
---

# Async React for Inertia

## 基本方針

このプロジェクトのAsync Reactは、Inertiaをページデータと通信の中心に置く。
React 19のAPIを一律に適用せず、状態と非同期処理の所有者を先に決める。

### Inertiaが所有するもの

- URL、ルーティング、ページコンポーネントの交換
- Laravel Controllerが生成するページprops
- Partial Reload、Deferred Props、prefetch
- フォーム送信、Precognition、バリデーションエラー
- `processing`、progress、visitの開始・完了・キャンセル

### Reactが所有するもの

- controlled inputの表示値
- モーダル、メニュー、ポップオーバーの開閉
- focus、selection、ページ内だけのタブ
- React内で完結する重い表示更新
- optimistic UI
- mutationを起点とする局所的なpending表現

### アダプター

`ActionButton`、`ActionScope`、`runInertiaAction`、`inertiaAction`、
`visitAction`、`InertiaActionLink` は、Inertiaの通信ライフサイクルを
Reactのaction表現へ接続する。Inertiaのpage swap自体をConcurrent Transitionへ
変えるものではない。

## 必須ルール

### Laravel由来のページデータ

1. Laravel由来のページデータは、原則としてInertia propsを使用する。
2. 検索、ページネーション、フィルタリングはPartial Reloadを優先する。
3. 初期表示に不要な重いpropsはInertia Deferred Propsを使用する。
4. 通常のInertia propsをPromiseへ変換して `Suspense + use()` で読み直さない。
5. 同じ重い集約UseCaseをDeferred propごとに繰り返し実行しない。

### フォーム

1. Inertiaフォームは `useForm().withPrecognition()` を第一選択とする。
2. 送信中は `form.processing`、バリデーションエラーは `form.errors` を使う。
3. `form.submit()`、`form.post()` などを包むだけの `startTransition` は使わない。
4. controlled inputの `setState` や `form.setData` をTransition化しない。

### Transition

Transitionを使うのは次の場合に限る。

- Reactが所有する非緊急なstate更新
- optimistic UI
- Inertia通信をactionの局所pending表現へ接続するアダプター

`isPending` はTransitionの進行状態であり、すべてのloading状態やerror状態の
代替ではない。Inertiaが `processing` を提供する場合は `processing` を使う。

action内で `await` 後にReact stateを更新する場合は、action contextの
`transition(() => setState(...))` で追加のTransitionに包む。

### Suspense

Suspenseを全Inertiaページの必須条件にしない。使用対象は次に限定する。

- `React.lazy` によるコード分割
- 安定したPromiseキャッシュを持つSuspense対応データソース
- Reactが所有する非同期レンダー境界

Laravel由来の遅延データにはInertiaの `<Deferred>` とDeferred Propsを優先する。

### LinkとButton

- 通常のGETナビゲーションはInertia標準 `Link` を第一選択とする。
- 単純な通信中表示には `Link` の `data-loading` 属性を使う。
- `InertiaActionLink` はpending共有、操作抑止、共通エラー処理など、
  標準 `Link` では表現できないaction契約がある場合だけ使う。
- `ActionButton` はサーバー状態を変更するmutation、またはReactが所有する
  非緊急なアプリケーションactionに使う。
- モーダル、メニュー、ポップオーバー、controlled input、focus、selectionなどの
  即時ローカルUI更新には通常の `Button` とイベントハンドラを使う。

### loadingとerror

- Inertiaフォーム: `form.processing` / `form.errors`
- Inertia標準Link: `data-loading`
- Actionアダプター: `isPending` / `data-pending`
- Deferred Props: `<Deferred fallback={...}>`
- 個別の業務エラー: `form.errors` またはaction内
- 予期しない共通エラー: `ActionScope onError` またはError Boundary

## 適用手順

1. sibling componentと現在のデータフローを確認する。
2. 非同期処理とstateの所有者をInertia／Reactに分類する。
3. 次の順で最小の仕組みを選ぶ。
   - Inertia props
   - Partial Reload
   - Deferred Props
   - `useForm().withPrecognition()`
   - 標準 `Link`
   - `ActionButton` / actionアダプター
   - React-owned Transition、optimistic UI、Suspense
4. loading、error、キャンセル時の表示とアクセシビリティを決める。
5. 初期表示、pending、成功、失敗、再試行をテストする。

## クイックリファレンス

| 要件 | 第一選択 |
| --- | --- |
| Laravelページデータ | Inertia props |
| 重い初期props | Inertia Deferred Props + `<Deferred>` |
| 検索・絞り込み・ページネーション | Inertia Partial Reload |
| Inertiaフォーム | `useForm().withPrecognition()` |
| フォーム送信中 | `form.processing` |
| 通常GET | Inertia `Link` + `data-loading` |
| mutationの局所pending | `ActionButton` + `runInertiaAction` |
| 即時ローカルUI | 通常のButton / `onClick` / `onChange` |
| React-owned非緊急更新 | `useTransition` |
| optimistic UI | `useOptimistic` |
| コード分割 | `React.lazy` + `Suspense` |
| Laravel由来の遅延表示 | Inertia `<Deferred>` |

## 禁止パターン

```tsx
// Inertiaのフォーム送信を意味なくTransition化しない
startTransition(() => form.submit());

// controlled inputをTransition化しない
startTransition(() => form.setData("query", value));

// 通常propsを機械的にPromiseへ変換しない
const data = use(createPromiseFromInertiaProps(props));

// 単純なGETリンクをaction adapterへ置き換えない
<InertiaActionLink href="/stocks" />;

// アプリ全体を1つのActionScopeで囲まない
<ActionScope><App /></ActionScope>;
```

## References

- `references/patterns.md` - InertiaとReactの非同期パターン
- `references/component-design.md` - コンポーネントの責務とAPI設計
