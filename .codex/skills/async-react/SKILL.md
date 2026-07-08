---
name: async-react
description: |
  React 19のAsync Reactパターンに沿ったコンポーネント・データフェッチ・状態管理コードの生成・実装支援スキル。Suspense、Transitions、useOptimistic、useActionState、use()フック、ViewTransition、Action Props等のReact 19ベストプラクティスを適用する。使用タイミング: (1) Reactコンポーネントの新規作成・リファクタリング時、(2) データフェッチやAPI呼び出しの実装時、(3) ローディング状態・楽観的更新の実装時、(4) フォーム処理・ボタンクリック等のユーザーインタラクション実装時、(5) Suspenseバウンダリの設計時、(6) ページネーション・検索・タブ切り替え等の非同期UIパターン実装時。使用しない場面: (1) React以外のフレームワーク、(2) SSR/RSC固有の実装（Server Components）、(3) スタイリングのみの変更。
---

# Async React - React 19 Best Practices Skill

## Core Philosophy

React 19時代のベストプラクティスは**Async Reactの考え方を取り入れること**に集約される（uhyo氏の提唱に基づく）。

非同期処理があることを前提にアプリケーションを実装し、**最適なUX**を目指す。APIをただ使うだけではなく、**汎用化し、個別の対応をせずとも最適化されたUXを提供できること**がゴールとなる。

## 3 Core Principles

### 1. 全てのステート更新はトランジション

`startTransition` / `useTransition` をデフォルトで使用する。一部の例外（テキスト入力の即座な反映等）を除き、**全てのステート更新はトランジションであることが望ましい**。

### 2. Suspenseは前提条件

Suspenseはもはや全ての前提であり必須。アプリケーション内に**どのようにSuspenseを配置し、境界を引くのか**考えることがアプリケーション設計において重要。

### 3. 宣言的な非同期UI

トランジションの「意味」を宣言し、具体的な挙動はReactに委ねる。プログラマーが「何を」を宣言し、「どのように」はReactが最適化する。

## Implementation Rules

### MUST（必ず適用）

1. **ボタンのクリックハンドラ**: `onClick` ではなく `action` propを受け取り、内部で `startTransition` または `useTransition` でラップする
2. **非同期データ取得**: `useEffect` + `useState` の代わりに、Suspense + `use()` フックを使う
3. **ローディング表示**: `isPending` で制御する。手動の `isLoading` ステートは使わない
4. **楽観的更新**: トグル・入力など即座のフィードバックが必要な場面では `useOptimistic` を使う
5. **Suspenseバウンダリ**: データ取得を行うコンポーネントの親に必ず `<Suspense>` を配置する
6. **await後のstate更新**: action内で `await` 後に `setState` する場合は、action context の `transition(() => setState(...))` で追加のトランジションに包む

### SHOULD（推奨）

1. **フォーム送信**: `useActionState` を使う
2. **タブ・検索のUI**: `useOptimistic` + `startTransition` で入力は即座に反映しつつバックグラウンドで処理
3. **ViewTransition**: 画面遷移やリスト変更時に `<ViewTransition>` でアニメーション統合
4. **キャッシュ付きデータフェッチ**: 同じクエリに対してpromiseをメモ化して返す
5. **プリフェッチ**: ナビゲーション前にデータをプリロードする
6. **ErrorBoundary**: Suspenseバウンダリの外側に `<ErrorBoundary>` を配置し、データフェッチのエラーを宣言的にハンドリングする
7. **action内のtry/catch**: `useActionState` や action prop のコールバック内で `try/catch` を使い、エラー状態を返す
8. **ActionScope onError**: toast / Sentry / 共通ログなど操作横断のエラー通知が必要な領域では `ActionScope` に `onError` を渡す。個別のバリデーションや業務エラーは action 内で処理する

### MUST NOT（禁止）

1. `useEffect` + `setState` でのデータフェッチ（Suspense + `use()` を使う）
2. 手動の `isLoading` / `isError` ステート管理（トランジションの `isPending` を使う）
3. ボタンコンポーネントで `onClick` のみを受け取る設計（`action` propパターンを使う）
4. Suspenseバウンダリなしでの `use()` フック使用
5. **レンダー中の親state更新**: 子コンポーネントのレンダー内で親の `setState` を呼ぶ（例: `use()` で取得したデータを元にレンダー中に親のステートを更新するパターン）。データは `use()` の戻り値から直接参照する
6. **不要な `e.stopPropagation()`**: イベントハンドラ内で明確な理由なく `stopPropagation()` を使わない。イベントバブリングはReactの正常な動作であり、不必要に止めるべきではない

## Pattern Quick Reference

| パターン             | 使用するAPI                          | 用途                                  |
| -------------------- | ------------------------------------ | ------------------------------------- |
| ボタン + API呼び出し | `useTransition` + `action` prop      | データ変更操作                        |
| 楽観的トグル         | `useOptimistic` + `startTransition`  | 即座のUI反映                          |
| 検索入力             | `useOptimistic` + `startTransition`  | 入力の即座反映 + バックグラウンド検索 |
| タブ切り替え         | `useOptimistic` + `startTransition`  | タブの即座切り替え                    |
| データ一覧表示       | `Suspense` + `use()`                 | 非同期データの宣言的表示              |
| フォーム送信         | `useActionState`                     | フォームのステート管理                |
| 共通actionエラー処理 | `ActionScope onError`                | toast / Sentry / 共通ログ             |
| ページ遷移           | `startTransition` + `ViewTransition` | スムーズなナビゲーション              |
| ページネーション     | `Suspense` + `startTransition`       | ちらつきのないページ切り替え          |

## References

詳細なコード例は以下を参照:

- `references/patterns.md` - 各パターンの詳細実装例
- `references/component-design.md` - 汎用コンポーネント設計パターン

## Anti-patterns to Fix

以下のパターンを見つけたら、Async Reactパターンへのリファクタリングを提案する:

```tsx
interface User {
  id: string;
  name: string;
}

// ❌ Anti-pattern: useEffect + useState でデータフェッチ
function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: User[]) => {
        setUsers(data);
        setLoading(false);
      });
  }, []);
  if (loading) return <Spinner />;
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}

// ✅ Async React pattern: Suspense + use()
function UserList() {
  const users = use(getUsers());
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
// 親コンポーネントで:
<Suspense fallback={<Spinner />}>
  <UserList />
</Suspense>;
```

```tsx
// ❌ Anti-pattern: onClick + 手動ローディング
interface SaveButtonOldProps {
  onSave: () => Promise<void>;
}

function SaveButton({ onSave }: SaveButtonOldProps) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await onSave();
        setLoading(false);
      }}
    >
      {loading ? <Spinner /> : "Save"}
    </button>
  );
}

// ✅ Async React pattern: action prop + useTransition
interface SaveButtonProps {
  action: () => Promise<void>;
  children: React.ReactNode;
}

function SaveButton({ action, children }: SaveButtonProps) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await action();
        });
      }}
    >
      {isPending ? <Spinner /> : children}
    </button>
  );
}
```
