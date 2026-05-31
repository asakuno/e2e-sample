# Inertia.js バックエンド実装

## 概要

Inertia.jsは、SPAのようなユーザー体験を提供しながら、サーバーサイドルーティングとコントローラーを維持できるモダンなアプローチである。APIを別途構築する必要がなく、Laravel側のコントローラーから直接Reactコンポーネントにデータを渡すことができる。

---

## データの受け渡しパターン

### パターン1: Web Controllers（Inertia.js）

**目的**: 初期ページ描画のみを担当。静的なマスターデータのみを提供。

```
Web Request → Web Controller → Inertia::render() → React Component
                                                         ↓
                                             （動的データが必要な場合）
                                                         ↓
                                                  API Request
```

### パターン2: API Controllers（REST API）

**目的**: CRUD操作、動的データの取得・更新を担当。

```
API Request → API Controller → Form Request → Use Case → Repository
                                                                ↓
                                                          JSON Response
```

---

## Web Controllers（ページ描画用）

### 基本実装

Web Controllersは静的なマスターデータのみを提供する。動的データはReact側からAPI経由で取得する。

```php
// app/Http/Controllers/Web/PostPageController.php
namespace App\Http\Controllers\Web;

use App\Enums\PostStatus;
use Inertia\Inertia;
use Inertia\Response;

class PostPageController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Post/Index', [
            'statusOptions' => PostStatus::toSelectArray(), // 静的マスターデータ
            'filters' => $request->only(['q', 'status']),    // クエリパラメータ
        ]);
        // 週報一覧データは React 側から API 経由で取得
    }

    public function create(): Response
    {
        return Inertia::render('Post/Create', [
            'reportStatuses' => PostStatus::toSelectArray(),
        ]);
    }

    public function edit(int $id): Response
    {
        return Inertia::render('Post/Edit', [
            'postId' => $id,
            'reportStatuses' => PostStatus::toSelectArray(),
        ]);
    }
}
```

### 命名規則

Web Controllers は `{Resource}PageController` の命名を使用する。

```php
// ✅ Good
class PostPageController extends Controller { }
class DashboardPageController extends Controller { }

// ❌ Bad
class PostWebController extends Controller { }
class PostController extends Controller { }  // API Controller と区別できない
```

---

## 遅延取得（Lazy Loading）

コントローラー側で `fn ()` でくるむと、必要な時にのみ関数が実行される。

```php
return Inertia::render('Post/Index', [
    'posts' => fn () => Post::with('tags')->get(),  // 遅延実行
    'users' => fn () => User::all(),                // 遅延実行
]);
```

**注意**: React側から `router.reload({ only: ['posts'] })` で明示的にリロードされるまで実行されない。

---

## 共有データ（HandleInertiaRequests）

全てのページで共有するデータは、HandleInertiaRequestsミドルウェアで定義する。

**app/Http/Middleware/HandleInertiaRequests.php**

```php
namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),

            // アプリケーション情報
            'app' => [
                'name' => config('app.name'),
            ],

            // 認証情報
            'auth' => [
                'user' => $request->user(),
            ],

            // フラッシュメッセージ（遅延実行）
            'toast' => fn () => $request->session()->get('toast'),
        ];
    }
}
```

### 共有データの種類

| データ種類 | 例 | 遅延実行 |
|----------|-----|---------|
| **アプリ情報** | `app.name`, `app.version` | 不要 |
| **認証情報** | `auth.user`, `auth.permissions` | 不要 |
| **フラッシュメッセージ** | `toast`, `errors` | 必須（`fn ()`） |
| **設定** | `locale`, `timezone` | 不要 |

---

## トースト通知

### Controller側の実装

```php
// 成功メッセージ
return redirect()->back()
    ->with('toast', '保存しました。');

// エラーメッセージ
return redirect()->back()
    ->with('toast', ['type' => 'error', 'message' => '保存に失敗しました。']);
```

### 複数のフラッシュメッセージ

```php
return redirect()->back()
    ->with('success', '週報を作成しました。')
    ->with('info', 'メールで通知を送信しました。');
```

---

## ベストプラクティス

### 1. Web Controllers は静的データのみ

動的データは API 経由で取得する。

```php
// ✅ Good: 静的データのみ
public function index(): Response
{
    return Inertia::render('Post/Index', [
        'statusOptions' => PostStatus::toSelectArray(),
    ]);
}

// ❌ Bad: 動的データを含む
public function index(): Response
{
    return Inertia::render('Post/Index', [
        'reports' => Post::paginate(20),  // API経由で取得すべき
    ]);
}
```

### 2. 共有データは最小限に

すべてのページで必要なデータのみを共有する。

```php
// ✅ Good: 必要最小限
'auth' => [
    'user' => $request->user() ? [
        'id' => $request->user()->id,
        'name' => $request->user()->name,
        'email' => $request->user()->email,
    ] : null,
],

// ❌ Bad: 不要なデータまで含む
'auth' => [
    'user' => $request->user(),  // リレーション等も全て含まれる
],
```

### 3. 遅延実行の活用

セッションデータやクエリが必要なデータは遅延実行する。

```php
// ✅ Good: 遅延実行
'toast' => fn () => $request->session()->get('toast'),

// ❌ Bad: 常に実行（パフォーマンス低下）
'toast' => $request->session()->get('toast'),
```

---

## 禁止事項

### 1. Web Controllers での動的データ提供禁止

動的データは API 経由で取得する。

```php
// ❌ 禁止
public function index(): Response
{
    return Inertia::render('Post/Index', [
        'reports' => Post::all(),  // 動的データ
    ]);
}

// ✅ 推奨
public function index(): Response
{
    return Inertia::render('Post/Index', [
        'statusOptions' => PostStatus::toSelectArray(),  // 静的データ
    ]);
}
```

### 2. 共有データでの重いクエリ禁止

共有データは全ページで実行されるため、重いクエリは避ける。

```php
// ❌ 禁止
'notifications' => Notification::with('user', 'post')->get(),  // 全ページで実行

// ✅ 推奨
'notifications' => fn () => Notification::with('user', 'post')->get(),  // 遅延実行
```

### 3. Eloquent Model の直接返却禁止

DTO または配列で返す。

```php
// ❌ 禁止
return Inertia::render('Post/Edit', [
    'report' => Post::find($id),  // Eloquent Model
]);

// ✅ 推奨
return Inertia::render('Post/Edit', [
    'reportId' => $id,
    'reportStatuses' => PostStatus::toSelectArray(),
]);
```

---

## API Controllers との使い分け

| 用途 | Controller 種別 | レスポンス形式 |
|------|---------------|--------------|
| **ページ描画** | Web Controller (`PageController`) | `Inertia::render()` |
| **データ取得** | API Controller | `JsonResponse` |
| **CRUD操作** | API Controller | `JsonResponse` |
| **フォーム送信** | API Controller | `JsonResponse` |

### ルーティング例

```php
// routes/web.php（ページ描画）
Route::middleware(['auth'])->group(function () {
    Route::get('/weekly-reports', [PostPageController::class, 'index'])
        ->name('weekly-reports.index');
    Route::get('/weekly-reports/create', [PostPageController::class, 'create'])
        ->name('weekly-reports.create');
    Route::get('/weekly-reports/{id}/edit', [PostPageController::class, 'edit'])
        ->name('weekly-reports.edit');
});

// routes/api.php（データ操作）
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/weekly-reports', [PostController::class, 'index']);
    Route::post('/weekly-reports', [PostController::class, 'store']);
    Route::put('/weekly-reports/{id}', [PostController::class, 'update']);
    Route::delete('/weekly-reports/{id}', [PostController::class, 'destroy']);
});
```
