# Inertia.js フロントエンド実装

## 概要

Inertia.jsを使用することで、SPAのようなユーザー体験を提供しながら、サーバーサイドルーティングを維持できる。React コンポーネントは Laravel Controller から渡される props を受け取り、動的データは API 経由で取得する。

---

## ページコンポーネントの基本

### Props の受け取り

Laravel Controller から渡される props を受け取る。props の型は明示的に定義する。

```tsx
// resources/js/pages/Post/Index.tsx
import { FC } from 'react';

interface Props {
  statusOptions: Array<{ value: string; label: string }>;
  filters: { q?: string; status?: string };
}

const PostIndex: FC<Props> = ({ statusOptions, filters }) => {
  // API経由で動的データを取得
  const { data: posts } = useFetchPosts(filters);

  return (
    <div>
      <h1>Posts</h1>
      <select defaultValue={filters.status}>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {/* ... */}
    </div>
  );
};

export default PostIndex;
```

---

## 共有データの使用

### TypeScript型定義

```typescript
// resources/js/types/index.d.ts
export interface Auth {
  user: App.Models.User | null;
}

export interface AppPageProps<T extends Record<string, unknown> = Record<string, unknown>> {
  app: {
    name: string;
  };
  auth: Auth;
  toast?: string;
}
```

### React側での使用

```tsx
import { usePage } from '@inertiajs/react';

const Component = () => {
  const { auth, toast } = usePage<AppPageProps>().props;

  return (
    <div>
      {auth.user && <span>Welcome, {auth.user.name}</span>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
```

---

## レイアウトの使用

### レイアウトコンポーネント

```tsx
// resources/js/layouts/BaseLayout.tsx
import { FC, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

const BaseLayout: FC<Props> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        {/* ナビゲーション */}
      </nav>
      <main className="container mx-auto py-6">
        {children}
      </main>
    </div>
  );
};

export default BaseLayout;
```

### ページでのレイアウト指定

```tsx
// resources/js/pages/Post/Index.tsx
import BaseLayout from '@/layouts/BaseLayout';

const PostIndex = ({ statusOptions }: Props) => {
  // ...
};

PostIndex.layout = (page: ReactNode) => <BaseLayout>{page}</BaseLayout>;

export default PostIndex;
```

---

## Wayfinder（型安全なルーティング）

Wayfinderは、LaravelのルートをTypeScriptの関数として生成し、型安全なページ遷移を実現する。

### インストールと生成

```bash
# ルートの生成
php artisan wayfinder:generate
```

生成されるファイル：
- `resources/js/actions/` - コントローラーベースのルート関数
- `resources/js/routes/` - 名前付きルートベースのルート関数

### 使用例

```tsx
// resources/js/pages/Post/Index.tsx
import { Link } from '@inertiajs/react';
import { show, store } from '@/routes/posts';

const PostIndex = () => {
  return (
    <div>
      {/* リンク */}
      <Link href={show(1).url}>View Detail</Link>

      {/* クエリパラメータ付き */}
      <Link href={show(1, { query: { tab: 'details' } }).url}>
        View Details Tab
      </Link>
    </div>
  );
};
```

### QueryParameter の使い方

```tsx
import { index } from '@/routes/posts';

// 基本的なクエリパラメータ
console.log(index({ query: { foo: 1, bar: 'test' } }));
// => { url: '/posts?foo=1&bar=test', method: 'get' }

// 現在のURLのパラメータとマージ
console.log(index({ mergeQuery: { foo: 1 } }));
// 現在のURL: /posts?baz=add の場合
// => { url: '/posts?baz=add&foo=1', method: 'get' }

// 配列形式
console.log(index({ query: { baz: ['aaa', 'bbb', 'ccc'] } }));
// => { url: '/posts?baz[]=aaa&baz[]=bbb&baz[]=ccc', method: 'get' }
```

---

## フォーム送信（POST/PUT/DELETE）

### Laravel Precognition の使用（推奨）

**重要**: `@inertiajs/react` の `useForm` は**使用禁止**。Laravel Precognition を使用する。

```tsx
// resources/js/pages/Post/Create.tsx
import { FC } from 'react';
import { useForm } from 'laravel-precognition-react';
import { router } from '@inertiajs/react';
import { store, index } from '@/routes/posts';

interface Props {
  statusOptions: Array<{ value: string; label: string }>;
}

const PostCreate: FC<Props> = ({ statusOptions }) => {
  const form = useForm<App.Data.CreatePostData>(
    'post',
    store().url,
    {
      userId: 0,
      weekStartDate: '',
      title: '',
      memo: undefined,
      status: 'draft',
      tagValues: [],
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.submit({
      onSuccess: () => {
        // 成功時の処理
        router.visit(index().url);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Title</label>
        <input
          type="text"
          value={form.data.title}
          onChange={(e) => form.setData('title', e.target.value)}
          onBlur={() => form.validate('title')}  // リアルタイムバリデーション
        />
        {form.errors.title && <p className="text-red-500">{form.errors.title}</p>}
      </div>

      <div>
        <label>Status</label>
        <select
          value={form.data.status}
          onChange={(e) => form.setData('status', e.target.value as App.Enums.PostStatus)}
        >
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={form.processing}>
        {form.processing ? '処理中...' : '作成'}
      </button>
    </form>
  );
};

export default PostCreate;
```

---

## 部分リロード（only オプション）

`only` オプションを使用すると、特定のpropsのみを再取得できる。

```tsx
import { router } from '@inertiajs/react';

// 特定のpropsのみリロード
router.reload({
  only: ['posts'],  // posts のみ再取得
});

// フォーム送信時の部分リロード
const handleSubmit = () => {
  form.submit('post', store().url, {
    only: ['posts', 'toast'],  // posts と toast のみ再取得
    onSuccess: () => reset(),
  });
};
```

---

## トースト通知

### React側（レイアウトでの実装）

```tsx
// resources/js/layouts/BaseLayout.tsx
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

const BaseLayout: FC<Props> = ({ children }) => {
  const { toast: message } = usePage<AppPageProps>().props;

  useEffect(() => {
    if (message) {
      toast.success(message);
    }
  }, [message]);

  return (
    <div>
      {/* ... */}
    </div>
  );
};
```

---

## ページ遷移

### Link コンポーネント

```tsx
import { Link } from '@inertiajs/react';
import { index, show } from '@/routes/weekly-reports';

<Link href={index().url}>Back to List</Link>
<Link href={show(report.id).url}>View Detail</Link>
```

### router.visit()

```tsx
import { router } from '@inertiajs/react';

// 通常の遷移
router.visit(index().url);

// クエリパラメータ付き
router.visit(index({ query: { status: 'submitted' } }).url);

// 部分リロード付き
router.visit(index().url, {
  only: ['reports'],
});
```

---

## ベストプラクティス

### 1. Precognition でリアルタイムバリデーション

`@inertiajs/react` の `useForm` は使用禁止。

```tsx
// ✅ Good: Laravel Precognition
import { useForm } from 'laravel-precognition-react';

const form = useForm<App.Data.CreatePostData>('post', store().url, { ... });

// ❌ Bad: @inertiajs/react の useForm
import { useForm } from '@inertiajs/react';  // 使用禁止
```

### 2. 型安全なルーティング

Wayfinder を使用して型安全なルーティングを実現する。

```tsx
// ✅ Good: Wayfinder
import { show } from '@/routes/posts';
<Link href={show(1).url}>View</Link>

// ❌ Bad: ハードコードされたURL
<Link href="/posts/1">View</Link>
```

### 3. 部分リロードの活用

不要なデータの再取得を避ける。

```tsx
// ✅ Good: 必要なpropsのみリロード
router.visit(index().url, {
  only: ['posts', 'toast'],
});

// ❌ Bad: 全propsをリロード
router.visit(index().url);
```

### 4. レイアウトの共通化

ページごとにレイアウトを設定する。

```tsx
// ✅ Good: レイアウト指定
PostIndex.layout = (page) => <BaseLayout>{page}</BaseLayout>;

// ❌ Bad: ページ内でレイアウト実装
const PostIndex = () => {
  return (
    <BaseLayout>
      {/* ... */}
    </BaseLayout>
  );
};
```

### 5. Props の型定義

すべての props に明示的な型定義を行う。

```tsx
// ✅ Good: 明示的な型定義
interface Props {
  statusOptions: Array<{ value: string; label: string }>;
  filters: { q?: string; status?: string };
}

const PostIndex: FC<Props> = ({ statusOptions, filters }) => {
  // ...
};

// ❌ Bad: 型定義なし
const PostIndex = ({ statusOptions, filters }) => {
  // ...
};
```

---

## 禁止事項

### 1. @inertiajs/react の useForm 使用禁止

Laravel Precognition を使用する。

```tsx
// ❌ 禁止
import { useForm } from '@inertiajs/react';

// ✅ 推奨
import { useForm } from 'laravel-precognition-react';
```

### 2. ハードコードされたURL禁止

Wayfinder を使用する。

```tsx
// ❌ 禁止
<Link href="/weekly-reports/1">View</Link>

// ✅ 推奨
import { show } from '@/routes/weekly-reports';
<Link href={show(1).url}>View</Link>
```

### 3. 型定義の省略禁止

すべての props、state、関数に型を明示する。

```tsx
// ❌ 禁止
const handleSubmit = (e) => {  // 型なし
  // ...
};

// ✅ 推奨
const handleSubmit = (e: React.FormEvent) => {
  // ...
};
```

### 4. グローバル状態の濫用禁止

Inertia の shared data または props で管理できるデータは、グローバル状態管理ライブラリを使用しない。

```tsx
// ❌ 禁止: 不要なグローバル状態
const [user, setUser] = useGlobalState('user');  // shared data で十分

// ✅ 推奨: shared data を使用
const { auth } = usePage<AppPageProps>().props;
```

---

## API データ取得パターン

動的データは API 経由で取得する。カスタムフックに分離する。

```tsx
// hooks/usePosts.ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Filters {
  q?: string;
  status?: string;
}

export const useFetchPosts = (filters: Filters) => {
  return useQuery({
    queryKey: ['posts', filters],
    queryFn: async () => {
      const { data } = await axios.get('/api/posts', {
        params: filters,
      });
      return data;
    },
  });
};
```

```tsx
// pages/Post/Index.tsx
const PostIndex: FC<Props> = ({ statusOptions, filters }) => {
  const { data: posts, isLoading } = useFetchPosts(filters);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};
```
