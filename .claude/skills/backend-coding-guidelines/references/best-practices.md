# ベストプラクティス

## コード規約

### PHP（Laravel Pint）

```bash
# コード整形の実行
./vendor/bin/pint

# 変更されたファイルのみ整形
./vendor/bin/pint --dirty

# テストのみ（整形しない）
./vendor/bin/pint --test
```

---

## Type Hints & PHPDoc

### 必須の型宣言

すべての public メソッドに型宣言を必須とする。

```php
// ✅ Good: 明示的な型宣言
public function execute(CreatePostData $data): Post
{
    // ...
}

// ❌ Bad: 型宣言なし
public function execute($data)
{
    // ...
}
```

### 配列の型定義

PHPDoc で配列の型を明示する。

```php
/**
 * @param array<int> $ids
 * @return array<Post>
 */
public function findByIds(array $ids): array
{
    // ...
}
```

### Nullable の明示

Nullable な引数・戻り値は `?` を使用する。

```php
// ✅ Good
public function findById(int $id): ?Post
{
    return Post::find($id);
}

// ❌ Bad
public function findById(int $id): Post|null  // 非推奨
{
    return Post::find($id);
}
```

---

## データベース

### N+1問題の防止

Eager Loading を必ず使用する。

```php
// ❌ Bad: N+1問題
$reports = Post::all();
foreach ($reports as $report) {
    echo $report->user->name; // ループごとにクエリ実行
}

// ✅ Good: Eager Loading
$reports = Post::with('user')->get();
foreach ($reports as $report) {
    echo $report->user->name; // 1回のクエリで取得済み
}
```

### Migration での型定義

適切な型定義と制約を設定する。

```php
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->date('week_start_date');
    $table->string('title', 255);
    $table->text('memo')->nullable();
    $table->string('status', 50); // Enum
    $table->timestamps();

    // 複合ユニーク制約
    $table->unique(['user_id', 'week_start_date']);

    // インデックス
    $table->index('status');
    $table->index('week_start_date');
});
```

### トランザクション

複数のDB操作はトランザクションでラップする。

```php
// ✅ Good: トランザクション使用
public function create(...): Post
{
    return DB::transaction(function () use (...) {
        $post = Post::create([...]);

        foreach ($tagValues as $tagValue) {
            $post->tagValues()->create($tagValue);
        }

        return $post->fresh(['tagValues']);
    });
}

// ❌ Bad: トランザクションなし
public function create(...): Post
{
    $post = Post::create([...]);

    foreach ($tagValues as $tagValue) {
        $post->tagValues()->create($tagValue);
        // エラー発生時にロールバックされない
    }

    return $post;
}
```

---

## セキュリティ

### 認可チェック

全ての保護リソースに対して Policy を使用する。

```php
// Controller
public function show(Post $post): JsonResponse
{
    $this->authorize('view', $post); // Policy チェック

    return response()->json([
        'data' => new PostResource($post),
    ]);
}

// Policy
public function view(User $user, Post $post): bool
{
    return $post->user_id === $user->id
        || $post->sharedUsers()->where('user_id', $user->id)->exists();
}
```

### Mass Assignment 対策

ホワイトリスト方式（`$fillable`）を使用する。

```php
// Model
protected $fillable = [
    'user_id',
    'title',
    'memo',
]; // ホワイトリスト方式（推奨）

protected $guarded = ['id']; // ブラックリスト方式（非推奨）
```

### SQLインジェクション対策

Eloquent ORM または Query Builder を使用する。

```php
// ✅ Good: Eloquent使用
$reports = Post::where('user_id', $userId)->get();

// ✅ Good: パラメータバインディング
$reports = DB::select('SELECT * FROM posts WHERE user_id = ?', [$userId]);

// ❌ Bad: 文字列連結（危険）
$reports = DB::select("SELECT * FROM posts WHERE user_id = $userId");
```

### XSS対策

Blade テンプレートでは `{{ }}` を使用する。

```blade
{{-- ✅ Good: 自動エスケープ --}}
<div>{{ $content }}</div>

{{-- ❌ Bad: エスケープなし --}}
<div>{!! $content !!}</div>
```

React では JSX のデフォルト動作を活用する。

```tsx
// ✅ Good: JSX自動エスケープ
<div>{userInput}</div>

// ❌ Bad: dangerouslySetInnerHTML（DOMPurify必須）
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

---

## パフォーマンス

### キャッシュ戦略

頻繁にアクセスされるマスターデータはキャッシュする。

```php
// マスターデータのキャッシュ
public function getAllTags(): Collection
{
    return Cache::remember('tags', 3600, function () {
        return Tag::all();
    });
}

// キャッシュクリア
Cache::forget('tags');
```

### ページネーション

大量データは必ずページネーションする。

```php
// ✅ Good: ページネーション
public function index(): JsonResponse
{
    $reports = Post::paginate(20);

    return response()->json([
        'data' => PostResource::collection($reports),
        'meta' => [
            'current_page' => $reports->currentPage(),
            'total' => $reports->total(),
        ],
    ]);
}

// ❌ Bad: 全件取得
$reports = Post::all(); // メモリ枯渇の危険性
```

### Lazy Loading の回避

`with()` で必要なリレーションを事前読み込みする。

```php
// ✅ Good: Eager Loading
$reports = Post::with(['user', 'tagValues.tag'])->get();

// ❌ Bad: Lazy Loading（N+1問題）
$reports = Post::all();
foreach ($reports as $report) {
    echo $report->user->name; // 個別にクエリ実行
}
```

### チャンク処理

大量データ処理はチャンク処理を使用する。

```php
// ✅ Good: チャンク処理
Post::chunk(100, function ($reports) {
    foreach ($reports as $report) {
        // 処理
    }
});

// ❌ Bad: 全件取得
$reports = Post::all(); // メモリ枯渇の危険性
foreach ($reports as $report) {
    // 処理
}
```

---

## エラーハンドリング

### 集中例外管理（bootstrap/app.php）

```php
return Application::configure(basePath: dirname(__DIR__))
    ->withExceptions(function (Exceptions $exceptions): void {
        // Domain exception handlers
        $exceptions->renderable(function (PostNotFoundException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], $e->getCode());
            }
            abort($e->getCode(), $e->getMessage());
        });

        // Inertia custom error pages
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            if ($request->header('X-Inertia') && in_array($response->getStatusCode(), [401, 403, 404, 500])) {
                return Inertia::render('Errors/ErrorPage', [
                    'status' => $response->getStatusCode(),
                    'message' => $exception->getMessage(),
                ])->toResponse($request)->setStatusCode($response->getStatusCode());
            }
            return $response;
        });
    })->create();
```

### Domain Exception の定義

```php
// app/Exceptions/Domain/PostNotFoundException.php
namespace App\Exceptions\Domain;

class PostNotFoundException extends \Exception
{
    public function __construct(int $id)
    {
        parent::__construct("Weekly report with ID {$id} not found.", 404);
    }
}

// 使用例
if (!$report) {
    throw new PostNotFoundException($id);
}
```

---

## Git コミット規約

### コミットメッセージ形式

```
<type>: <subject>

<body>

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `docs`: ドキュメント更新
- `chore`: ビルドプロセス、ツール変更

### 例

```
feat: Add weekly report export to CSV

- Implement CSV export service
- Add UTF-8 BOM for Excel compatibility
- Include KPI values in export

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 型生成のワークフロー

### 開発フロー

```bash
# 1. マイグレーション実行後、Model型を生成
php artisan migrate

# 2. 統合型生成（DTO + Model + Enum）
php artisan typescript:transform

# 3. Wayfinderルート生成
php artisan wayfinder:generate

# 4. フロントエンドビルド
npm run build
```

---

## 環境変数管理

### 本番環境設定

```env
# 必須設定
APP_ENV=production
APP_DEBUG=false

# セッション
SESSION_DRIVER=redis
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax

# ハッシュ
HASH_DRIVER=argon2id

# CORS
SANCTUM_STATEFUL_DOMAINS=example.com,www.example.com
SESSION_DOMAIN=.example.com
```

---

## ログ出力

### ログレベル

```php
// デバッグ情報
Log::debug('Debug information', ['data' => $data]);

// 情報
Log::info('User logged in', ['user_id' => $userId]);

// 警告
Log::warning('Deprecated method called', ['method' => $method]);

// エラー
Log::error('Database error', ['exception' => $e->getMessage()]);

// 重大なエラー
Log::critical('System failure', ['error' => $error]);
```

### 構造化ログ

```php
// ✅ Good: 構造化ログ
Log::info('Weekly report created', [
    'report_id' => $report->id,
    'user_id' => $report->user_id,
    'status' => $report->status->value,
]);

// ❌ Bad: 文字列連結
Log::info("Weekly report {$report->id} created by user {$report->user_id}");
```

---

## 禁止事項まとめ

### 共通禁止事項

- **型宣言の省略**（すべての public メソッドに型宣言を必須）
- **マジックナンバー**（定数化または Enum 使用）
- **テストなしのコミット**
- **sleep() の使用**（テスト内）
- **実際の外部APIへのアクセス**（テスト内）

### レイヤー間の禁止事項

- **Controller での直接的なDB アクセス**（Repository 経由必須）
- **Controller でのビジネスロジック実装**（UseCase に実装）
- **Eloquent Model を Domain 層に直接返す**（DTO 経由）
- **Model が Repository に依存**
- **Use Case が Resource に依存**

### セキュリティ関連禁止事項

- **Mass Assignment の $guarded 使用**（$fillable 推奨）
- **文字列連結によるSQL構築**
- **Blade での {!! !!} 使用**（HTMLPurifier なし）
- **React での dangerouslySetInnerHTML 使用**（DOMPurify なし）
- **認可チェックなしのリソースアクセス**

### フロントエンド関連禁止事項

- **@inertiajs/react の useForm 使用**（Laravel Precognition 推奨）
- **Web Controllers での動的データ提供**（API 経由推奨）
- **ハードコードされたURL**（Wayfinder 使用）

---

## 定期的なメンテナンス

### 依存関係の更新

```bash
# Composer パッケージ更新
composer update

# セキュリティ脆弱性チェック
composer audit

# npm パッケージ更新
npm update

# npm セキュリティチェック
npm audit
```

### コード品質チェック

```bash
# Laravel Pint
./vendor/bin/pint --test

# PHPStan（静的解析）
./vendor/bin/phpstan analyse

# テスト実行
php artisan test --coverage

# TypeScript型チェック
npm run typecheck
```

### パフォーマンス最適化

```bash
# ルートキャッシュ
php artisan route:cache

# 設定キャッシュ
php artisan config:cache

# ビューキャッシュ
php artisan view:cache

# イベントキャッシュ
php artisan event:cache
```

**注意**: 開発環境ではキャッシュをクリアする。

```bash
php artisan optimize:clear
```
