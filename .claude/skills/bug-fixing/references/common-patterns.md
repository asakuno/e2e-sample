# よくあるバグパターンと解決策

このドキュメントでは、Laravel + React/Inertia.js プロジェクトでよく発生するバグパターンと、その解決策を記載します。

## 目次

- [Laravel バックエンド](#laravel-バックエンド)
  - [1. N+1 クエリ問題](#1-n1-クエリ問題)
  - [2. Mass Assignment 脆弱性](#2-mass-assignment-脆弱性)
  - [3. CSRF トークンエラー](#3-csrf-トークンエラー)
  - [4. セッションデータが保存されない](#4-セッションデータが保存されない)
  - [5. 認可エラー（403 Forbidden）](#5-認可エラー403-forbidden)
  - [6. バリデーションエラーが表示されない](#6-バリデーションエラーが表示されない)
- [React フロントエンド](#react-フロントエンド)
  - [1. useEffect の無限ループ](#1-useeffect-の無限ループ)
  - [2. useState の非同期更新](#2-usestate-の非同期更新)
  - [3. Inertia のデータが更新されない](#3-inertia-のデータが更新されない)
  - [4. Props の型エラー](#4-props-の型エラー)
  - [5. フォームのリアルタイムバリデーションが動かない](#5-フォームのリアルタイムバリデーションが動かない)
  - [6. Laravel Precognition で 419 エラー](#6-laravel-precognition-で-419-エラー)
  - [7. Wayfinder ルート関数が undefined](#7-wayfinder-ルート関数が-undefined)
  - [8. DTO 型不一致エラー](#8-dto-型不一致エラー)
- [Inertia.js 関連](#inertiajs-関連)
  - [1. Flash メッセージが表示されない](#1-flash-メッセージが表示されない)
  - [2. Inertia リンクでページ遷移しない](#2-inertia-リンクでページ遷移しない)
- [セキュリティ関連](#セキュリティ関連)
  - [1. XSS 脆弱性](#1-xss-脆弱性)
  - [2. SQL インジェクション](#2-sql-インジェクション)
- [パフォーマンス関連](#パフォーマンス関連)
  - [1. 大量データの取得で OOM（メモリ不足）](#1-大量データの取得で-oomメモリ不足)
  - [2. React の不要な再レンダリング](#2-react-の不要な再レンダリング)

---

## Laravel バックエンド

### 1. N+1 クエリ問題

**症状**: ページ読み込みが遅い、大量のSQLクエリが発行される

**原因**: Eloquent のリレーションを遅延ロードしている

```php
// ❌ 悪い例: N+1問題
$posts = Post::all();
foreach ($posts as $post) {
    echo $post->user->name; // ループごとにクエリ実行
}
```

**解決策**: Eager Loading を使用する

```php
// ✅ 良い例
$posts = Post::with('user')->get();
foreach ($posts as $post) {
    echo $post->user->name; // 1回のクエリで取得済み
}
```

---

### 2. Mass Assignment 脆弱性

**症状**: 意図しないカラムが更新される

**原因**: `$fillable` または `$guarded` が適切に設定されていない

```php
// ❌ 危険
class User extends Model
{
    protected $guarded = []; // すべてのカラムが更新可能
}

// 攻撃者がis_admin=1を送信すると管理者になれる
User::create($request->all());
```

**解決策**: `$fillable` でホワイトリスト方式を使用

```php
// ✅ 安全
class User extends Model
{
    protected $fillable = ['name', 'email', 'password'];
}
```

---

### 3. CSRF トークンエラー

**症状**: フォーム送信時に 419 エラー（CSRF Token Mismatch）

**原因**: Blade テンプレートに `@csrf` ディレクティブがない

```blade
{{-- ❌ 悪い例 --}}
<form method="POST" action="/login">
    <input type="email" name="email" />
    <button type="submit">Login</button>
</form>
```

**解決策**: `@csrf` ディレクティブを追加

```blade
{{-- ✅ 良い例 --}}
<form method="POST" action="/login">
    @csrf
    <input type="email" name="email" />
    <button type="submit">Login</button>
</form>
```

**React SPAの場合**: Laravel Precognitionを使用

```typescript
// ✅ React SPA
import { useForm } from 'laravel-precognition-react';

const form = useForm('post', route('login'), {
    email: '',
    password: '',
});
```

---

### 4. セッションデータが保存されない

**症状**: セッションに保存したデータが次のリクエストで消える

**原因**: セッションドライバが `file` で、ファイルシステムの権限がない

**解決策**: `storage/framework/sessions/` の権限を確認

```bash
chmod -R 775 storage/framework/sessions
chown -R www-data:www-data storage/framework/sessions
```

または、セッションドライバを `database` または `redis` に変更

```env
SESSION_DRIVER=database
```

---

### 5. 認可エラー（403 Forbidden）

**症状**: 自分のリソースにアクセスできない

**原因**: Policy の記述ミス、または Policy の登録忘れ

```php
// ❌ 誤った Policy
public function update(User $user, Post $post): bool
{
    return $user->id = $post->user_id; // = ではなく ==
}
```

**解決策**: 比較演算子を修正

```php
// ✅ 正しい Policy
public function update(User $user, Post $post): bool
{
    return $user->id === $post->user_id;
}
```

---

### 6. バリデーションエラーが表示されない

**症状**: フォーム送信時にバリデーションエラーがフロントエンドに返らない

**原因**: API エンドポイントで `Accept: application/json` ヘッダーがない

**解決策**: Axios の設定を確認

```typescript
// ✅ 正しい Axios 設定
const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // 重要
    },
    withCredentials: true,
    withXSRFToken: true,
});
```

---

## React フロントエンド

### 1. useEffect の無限ループ

**症状**: ページが固まる、API リクエストが無限に発行される

**原因**: `useEffect` の依存配列が正しくない

```tsx
// ❌ 悪い例
useEffect(() => {
    fetchData();
}, [data]); // data が更新されるたびに fetchData が呼ばれる
```

**解決策**: 依存配列を適切に設定

```tsx
// ✅ 良い例
useEffect(() => {
    fetchData();
}, []); // 初回のみ実行

// または、必要な依存のみ指定
useEffect(() => {
    fetchData(userId);
}, [userId]); // userId が変更されたときのみ実行
```

---

### 2. useState の非同期更新

**症状**: `setState` 直後に state が更新されていない

**原因**: `setState` は非同期で実行される

```tsx
// ❌ 誤解を招く例
const [count, setCount] = useState(0);

const handleClick = () => {
    setCount(count + 1);
    console.log(count); // まだ 0 が表示される
};
```

**解決策**: 関数形式の `setState` を使用

```tsx
// ✅ 良い例
const handleClick = () => {
    setCount((prev) => prev + 1);
};

// または useEffect で変更を監視
useEffect(() => {
    console.log(count); // 更新後の値が表示される
}, [count]);
```

---

### 3. Inertia のデータが更新されない

**症状**: サーバーからデータを取得したのに画面が更新されない

**原因**: Inertia の部分リロードで `only` オプションを使用していない

**解決策**: `only` オプションで必要な props のみリロード

```typescript
// ✅ 正しい部分リロード
router.reload({
    only: ['posts'], // posts のみ再取得
});
```

---

### 4. Props の型エラー

**症状**: TypeScript で型エラーが発生する

**原因**: Laravel からの props の型定義が不正確

**解決策**: `php artisan typescript:transform` で型を再生成

```bash
php artisan typescript:transform
```

```tsx
// ✅ 生成された型を使用
interface Props {
    posts: App.Models.Post[];
    statusOptions: Array<{ value: string; label: string }>;
}

const PostIndex: FC<Props> = ({ posts, statusOptions }) => {
    // ...
};
```

---

### 5. フォームのリアルタイムバリデーションが動かない

**症状**: Laravel Precognition のリアルタイムバリデーションが実行されない

**原因**: `validate()` を呼んでいない

```tsx
// ❌ 悪い例
<input
    type="text"
    value={form.data.title}
    onChange={(e) => form.setData('title', e.target.value)}
    // onBlur がない
/>
```

**解決策**: `onBlur` で `validate()` を呼ぶ

```tsx
// ✅ 良い例
<input
    type="text"
    value={form.data.title}
    onChange={(e) => form.setData('title', e.target.value)}
    onBlur={() => form.validate('title')} // リアルタイムバリデーション
/>
{form.errors.title && <p>{form.errors.title}</p>}
```

---

### 6. Laravel Precognition で 419 エラー

**症状**: フォーム送信時またはリアルタイムバリデーション時に 419 エラー（CSRF token mismatch）が発生する

**原因**: `/sanctum/csrf-cookie` への事前アクセス漏れ、または `withCredentials` / `withXSRFToken` の設定漏れ

```tsx
// ❌ 悪い例: CSRF トークン取得なし
const form = useForm('post', '/api/posts', initialData);
form.submit(); // 419 エラー
```

**解決策**: ログイン前に CSRF トークンを取得し、Axios 設定を確認する

```tsx
// ✅ 良い例: CSRF トークン取得
import axios from 'axios';

// 1. Axios グローバル設定（src/services/api.ts など）
axios.defaults.withCredentials = true;
axios.defaults.withXSRFToken = true;

// 2. ログイン前に CSRF トークン取得
const getCsrfToken = async () => {
    await axios.get('/sanctum/csrf-cookie');
};

// 3. ログイン処理
const login = async (email: string, password: string) => {
    await getCsrfToken(); // 最初に取得
    await axios.post('/login', { email, password });
};
```

**チェックリスト**:
- [ ] `/sanctum/csrf-cookie` にアクセスしているか
- [ ] `axios.defaults.withCredentials = true` が設定されているか
- [ ] `axios.defaults.withXSRFToken = true` が設定されているか
- [ ] `config/sanctum.php` の `stateful` ドメインが正しいか

---

### 7. Wayfinder ルート関数が undefined

**症状**: `route()` 関数が `undefined` で、型エラーまたはランタイムエラーが発生する

**原因**: `php artisan wayfinder:generate` の未実行、または生成ファイルのインポート漏れ

```tsx
// ❌ 悪い例: 型エラー
import { show } from '@/routes/posts'; // Cannot find module
```

**解決策**: Wayfinder の型生成コマンドを実行する

```bash
# 1. ルート関数を生成
php artisan wayfinder:generate

# 2. 生成ファイルを確認
# resources/js/routes/ ディレクトリに生成される
# resources/js/actions/ ディレクトリにも生成される
```

```tsx
// ✅ 良い例: 生成後のインポート
import { show, index, store } from '@/routes/posts';

<Link href={show(1).url}>View Post</Link>
<Link href={index().url}>All Posts</Link>
```

**チェックリスト**:
- [ ] `php artisan wayfinder:generate` を実行したか
- [ ] `resources/js/routes/` にファイルが生成されているか
- [ ] ルート名が正しいか（`routes/web.php` で定義されているか）
- [ ] TypeScript のキャッシュをクリアしたか（`rm -rf node_modules/.vite`）

---

### 8. DTO 型不一致エラー

**症状**: TypeScript と Laravel の型が一致せず、型エラーが発生する

**原因**: `php artisan typescript:transform` の未実行、または DTO 定義と生成された型の不一致

```tsx
// ❌ 悪い例: 型不一致
interface Props {
    posts: any; // Laravel からの型が不明
}
```

**解決策**: 型生成を実行し、自動化する

```bash
# 1. 手動で型生成
php artisan typescript:transform

# 2. 生成ファイルを確認
# resources/js/types/generated.d.ts に生成される
```

**自動化の推奨**:

```json
// composer.json
{
    "scripts": {
        "post-autoload-dump": [
            "@php artisan package:discover --ansi",
            "@php artisan typescript:transform"
        ]
    }
}
```

```tsx
// ✅ 良い例: 生成された型を使用
interface Props {
    posts: App.Models.Post[];
    statusOptions: Array<{ value: string; label: string }>;
}
```

**チェックリスト**:
- [ ] `php artisan typescript:transform` を実行したか
- [ ] DTO に `#[TypeScript()]` アトリビュートが付与されているか
- [ ] Model に `#[TypeScript()]` アトリビュートが付与されているか
- [ ] `config/typescript-transformer.php` が正しく設定されているか
- [ ] `resources/js/types/generated.d.ts` が更新されているか

---

## Inertia.js 関連

### 1. Flash メッセージが表示されない

**症状**: サーバーから `with('success', ...)` で送信したメッセージが表示されない

**原因**: Inertia の shared data で flash メッセージを取得していない

**解決策**: `HandleInertiaRequests` ミドルウェアで共有データを設定

```php
// app/Http/Middleware/HandleInertiaRequests.php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'toast' => fn () => $request->session()->get('toast'),
    ];
}
```

```tsx
// React 側
const { toast } = usePage<AppPageProps>().props;

useEffect(() => {
    if (toast) {
        alert(toast); // または toast.success(toast)
    }
}, [toast]);
```

---

### 2. Inertia リンクでページ遷移しない

**症状**: `<Link>` をクリックしてもページが遷移しない

**原因**: `href` に Wayfinder の `.url` を付けていない

```tsx
// ❌ 悪い例
import { show } from '@/routes/posts';

<Link href={show(1)}>View</Link> // オブジェクトが渡されている
```

**解決策**: `.url` プロパティを使用

```tsx
// ✅ 良い例
import { show } from '@/routes/posts';

<Link href={show(1).url}>View</Link>
```

---

## セキュリティ関連

### 1. XSS 脆弱性

**症状**: ユーザー入力がそのまま表示され、スクリプトが実行される

**原因**: Blade で `{!! !!}` を使用、または React で `dangerouslySetInnerHTML` を使用

```blade
{{-- ❌ 危険 --}}
<div>{!! $content !!}</div>
```

**解決策**: 自動エスケープを使用、または HTMLPurifier / DOMPurify を使用

```blade
{{-- ✅ 安全 --}}
<div>{{ $content }}</div>

{{-- HTML許可時は HTMLPurifier --}}
<div>{!! Purifier::clean($content) !!}</div>
```

```tsx
// React で HTML 許可時は DOMPurify
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(content)
}} />
```

---

### 2. SQL インジェクション

**症状**: ユーザー入力が SQL クエリに直接埋め込まれている

**原因**: 文字列連結で SQL を構築

```php
// ❌ 危険
$email = $request->input('email');
$users = DB::select("SELECT * FROM users WHERE email = '$email'");
```

**解決策**: Eloquent ORM または パラメータバインディングを使用

```php
// ✅ 安全
$users = User::where('email', $email)->get();

// または
$users = DB::select('SELECT * FROM users WHERE email = ?', [$email]);
```

---

## パフォーマンス関連

### 1. 大量データの取得で OOM（メモリ不足）

**症状**: `Allowed memory size of ... bytes exhausted`

**原因**: `all()` で全データを取得

```php
// ❌ 悪い例
$posts = Post::all(); // 全件取得
```

**解決策**: ページネーションまたはチャンク処理を使用

```php
// ✅ ページネーション
$posts = Post::paginate(20);

// ✅ チャンク処理
Post::chunk(100, function ($posts) {
    foreach ($posts as $post) {
        // 処理
    }
});
```

---

### 2. React の不要な再レンダリング

**症状**: パフォーマンスが悪い、入力が遅い

**原因**: コンポーネントが頻繁に再レンダリングされる

**解決策**: `useMemo` / `useCallback` / `React.memo` を使用

```tsx
// ✅ 良い例
const expensiveValue = useMemo(() => {
    return computeExpensiveValue(data);
}, [data]);

const handleClick = useCallback(() => {
    // クリック処理
}, []);
```
