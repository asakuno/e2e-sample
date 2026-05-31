# バックエンド コーディング規約

## 基本設定

### Strict Types 宣言

すべての PHP ファイルで `declare(strict_types=1)` を宣言する。

```php
<?php

declare(strict_types=1);

namespace App\UseCases\Post;

use App\Data\Post\CreatePostData;
use App\Models\Post;
// ...
```

---

## 命名規則

### Controllers

| 種類 | 命名規則 | 例 |
|------|---------|-----|
| **Web Controller** | `[Resource]PageController` | `PostPageController` |
| **API Controller** | `[Resource]Controller` | `PostController` |

```php
// ✅ Good
class PostPageController extends Controller { }
class PostController extends Controller { }

// ❌ Bad
class PostWebController extends Controller { }
class PostApiController extends Controller { }
```

### Form Requests

| 用途 | 命名規則 | 例 |
|------|---------|-----|
| **作成** | `Store[Resource]Request` | `StorePostRequest` |
| **更新** | `Update[Resource]Request` | `UpdatePostRequest` |
| **検索** | `Search[Resource]sRequest` | `SearchPostsRequest` |

```php
// ✅ Good
class StorePostRequest extends FormRequest { }
class UpdatePostRequest extends FormRequest { }

// ❌ Bad
class CreatePostRequest extends FormRequest { }
class PostStoreRequest extends FormRequest { }
```

### Use Cases

| 用途 | 命名規則 | 例 |
|------|---------|-----|
| **作成** | `Create[Resource]UseCase` | `CreatePostUseCase` |
| **更新** | `Update[Resource]UseCase` | `UpdatePostUseCase` |
| **削除** | `Delete[Resource]UseCase` | `DeletePostUseCase` |
| **取得** | `Get[Resource]sUseCase` | `GetPostsUseCase` |

```php
// ✅ Good
class CreatePostUseCase { }
class GetPostsUseCase { }

// ❌ Bad
class PostCreateUseCase { }
class PostGetter { }
```

### Services

| 命名規則 | 例 |
|---------|-----|
| `[Resource][Function]Service` | `PostExportService` |
| | `DashboardDataService` |

```php
// ✅ Good
class PostExportService { }
class DashboardDataService { }

// ❌ Bad
class ExportService { }
class DataService { }
```

### Repositories

| 種類 | 命名規則 | 例 |
|------|---------|-----|
| **Interface** | `[Resource]RepositoryInterface` | `PostRepositoryInterface` |
| **Implementation** | `[Resource]Repository` | `PostRepository` |

```php
// ✅ Good: Interface
interface PostRepositoryInterface { }

// ✅ Good: Implementation
class PostRepository implements PostRepositoryInterface { }

// ❌ Bad
interface IPostRepository { }
class EloquentPostRepository { }
```

### DTOs（Laravel Data）

| 用途 | 命名規則 | 例 |
|------|---------|-----|
| **作成** | `Create[Resource]Data` | `CreatePostData` |
| **更新** | `Update[Resource]Data` | `UpdatePostData` |
| **検索** | `Search[Resource]sData` | `SearchPostsData` |
| **ネスト** | `[Property]Data` | `TagValueData` |

```php
// ✅ Good
class CreatePostData extends Data { }
class TagValueData extends Data { }

// ❌ Bad
class PostCreateDTO { }
class PostData { }  // 用途が不明確
```

### Models

| 命名規則 | 例 |
|---------|-----|
| `[Resource]` | `Post` |
| | `Tag` |

```php
// ✅ Good
class Post extends Model { }
class Tag extends Model { }

// ❌ Bad
class PostModel extends Model { }
class TagEntity extends Model { }
```

### Resources

| 命名規則 | 例 |
|---------|-----|
| `[Resource]Resource` | `PostResource` |

```php
// ✅ Good
class PostResource extends JsonResource { }

// ❌ Bad
class PostApiResource extends JsonResource { }
```

### Policies

| 命名規則 | 例 |
|---------|-----|
| `[Resource]Policy` | `PostPolicy` |

```php
// ✅ Good
class PostPolicy { }

// ❌ Bad
class PostAccessPolicy { }
```

### Enums

| 命名規則 | 例 |
|---------|-----|
| `[Status/Type]` | `PostStatus` |
| | `TagDataType` |

```php
// ✅ Good
enum PostStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
}

// ❌ Bad
enum PostStatus: string { }
enum Status: string { }  // 不明確
```

---

## メソッド命名

### Repository メソッド

| 用途 | 命名規則 | 例 |
|------|---------|-----|
| **単一取得** | `findById`, `findBy[Property]` | `findById($id)` |
| | | `findByUserAndWeek($userId, $weekStartDate)` |
| **複数取得** | `findAll`, `findBy[Criteria]` | `findAll()` |
| | | `findByStatus($status)` |
| **作成** | `create` | `create(...)` |
| **更新** | `update` | `update($id, ...)` |
| **削除** | `delete` | `delete($id)` |

```php
// ✅ Good
public function findById(int $id): ?Post;
public function findByUserAndWeek(int $userId, string $weekStartDate): ?Post;
public function create(...): Post;

// ❌ Bad
public function getById(int $id): ?Post;
public function fetchByUserAndWeek(int $userId, string $weekStartDate): ?Post;
public function save(...): Post;  // 作成か更新か不明確
```

### UseCase メソッド

| 命名規則 | 例 |
|---------|-----|
| `execute` | `execute(CreatePostData $data): Post` |

```php
// ✅ Good
public function execute(CreatePostData $data): Post
{
    // ...
}

// ❌ Bad
public function handle(CreatePostData $data): Post { }
public function run(CreatePostData $data): Post { }
```

### Service メソッド

業務内容を明確に示す動詞を使用する。

```php
// ✅ Good
public function exportToCsv(Post $report): string;
public function exportToPdf(Post $report): string;
public function calculateTotalTag(Post $report): float;

// ❌ Bad
public function process(Post $report): string;
public function handle(Post $report): string;
```

---

## 修飾子の使用

### クラス修飾子

#### final の使用

継承を想定しないクラスには `final` を付与する。

```php
// ✅ Good: final使用
final class CreatePostUseCase { }
final class PostRepository implements PostRepositoryInterface { }
final class PostExportService { }

// ❌ Bad: final なし
class CreatePostUseCase { }  // 継承されるべきでない
```

**例外**: 以下のクラスには `final` を付与しない:
- `Model` クラス（Laravel の仕様）
- `Controller` クラス（テスト時のモック作成のため）
- `Policy` クラス（テスト時のモック作成のため）

#### readonly の使用

DTOには `readonly` を付与する。

```php
// ✅ Good: readonly使用
#[TypeScript()]
final readonly class CreatePostData extends Data
{
    public function __construct(
        public readonly int $userId,
        public readonly string $title,
    ) {}
}

// ❌ Bad: readonly なし
class CreatePostData extends Data
{
    public function __construct(
        public int $userId,        // 可変
        public string $title,      // 可変
    ) {}
}
```

### コンストラクタ修飾子

#### private コンストラクタ

DTO以外で Factory パターンを使用する場合、コンストラクタを `private` とする。

```php
// ✅ Good: Factory パターン
final class PostExportService
{
    private function __construct(
        private readonly StorageManager $storage,
    ) {}

    public static function create(): self
    {
        return new self(
            storage: app(StorageManager::class),
        );
    }
}

// DTO は public コンストラクタ
final readonly class CreatePostData extends Data
{
    public function __construct(  // public のまま
        public readonly int $userId,
    ) {}
}
```

---

## 型宣言

### 必須の型宣言

すべての public メソッドに型宣言を必須とする。

```php
// ✅ Good: 完全な型宣言
public function execute(CreatePostData $data): Post
{
    // ...
}

public function findById(int $id): ?Post
{
    // ...
}

// ❌ Bad: 型宣言なし
public function execute($data)
{
    // ...
}

public function findById($id)
{
    // ...
}
```

### Nullable 型

Nullable な引数・戻り値は `?` を使用する。

```php
// ✅ Good: ?型使用
public function findById(int $id): ?Post
{
    return Post::find($id);
}

public function getMemo(): ?string
{
    return $this->memo;
}

// ❌ Bad: Union型（非推奨）
public function findById(int $id): Post|null
{
    return Post::find($id);
}
```

### 配列型の PHPDoc

配列の型は PHPDoc で明示する。

```php
/**
 * @param array<int> $ids
 * @return array<Post>
 */
public function findByIds(array $ids): array
{
    return Post::whereIn('id', $ids)->get()->all();
}

/**
 * @param array<string, mixed> $data
 */
public function create(array $data): Post
{
    // ...
}
```

---

## 依存関係の静的解析（deptrac）

### レイヤー間の依存ルール

```yaml
# deptrac/layer.yaml
deptrac:
  paths:
    - ./app
  layers:
    - name: Presentation
      collectors:
        - type: directory
          value: app/Http/Controllers
    - name: Request
      collectors:
        - type: directory
          value: app/Http/Requests
    - name: UseCase
      collectors:
        - type: directory
          value: app/UseCases
    - name: Service
      collectors:
        - type: directory
          value: app/Services
    - name: Repository
      collectors:
        - type: directory
          value: app/Repositories
    - name: Model
      collectors:
        - type: directory
          value: app/Models
    - name: Resource
      collectors:
        - type: directory
          value: app/Http/Resources

  ruleset:
    Presentation:
      - Request
      - UseCase
      - Resource
    Request:
      - Data
    UseCase:
      - Repository
      - Service
      - Policy
    Service:
      - Repository
      - Model
    Repository:
      - Model
    Resource:
      - Model
    Model: []
```

### 検証コマンド

```bash
# deptrac 実行
./vendor/bin/deptrac

# CI での検証
./vendor/bin/deptrac --fail-on-uncovered
```

---

## 禁止事項

### 型宣言

- **型宣言の省略**（すべての public メソッドに型宣言必須）
- **mixed 型の使用**（具体的な型を明示する）
- **any 型の使用**（TypeScript）

### マジックナンバー

定数化または Enum を使用する。

```php
// ✅ Good: 定数化
private const MAX_RETRY_COUNT = 3;
private const DEFAULT_TIMEOUT = 30;

public function retry(): void
{
    for ($i = 0; $i < self::MAX_RETRY_COUNT; $i++) {
        // ...
    }
}

// ❌ Bad: マジックナンバー
public function retry(): void
{
    for ($i = 0; $i < 3; $i++) {  // 3 の意味が不明
        // ...
    }
}
```

### else の濫用

Early Return を使用する。

```php
// ✅ Good: Early Return
public function process(?User $user): void
{
    if ($user === null) {
        throw new InvalidArgumentException('User is required');
    }

    if (!$user->isActive()) {
        throw new InvalidArgumentException('User is not active');
    }

    // メインの処理
}

// ❌ Bad: else の濫用
public function process(?User $user): void
{
    if ($user !== null) {
        if ($user->isActive()) {
            // メインの処理
        } else {
            throw new InvalidArgumentException('User is not active');
        }
    } else {
        throw new InvalidArgumentException('User is required');
    }
}
```

### 例外処理

空の catch ブロックは禁止する。

```php
// ✅ Good: ログ出力またはre-throw
try {
    $this->repository->save($report);
} catch (\Exception $e) {
    Log::error('Failed to save report', ['exception' => $e->getMessage()]);
    throw $e;
}

// ❌ Bad: 空のcatch
try {
    $this->repository->save($report);
} catch (\Exception $e) {
    // 何もしない
}
```

---

## コメント規約

### PHPDoc

すべての public メソッドに PHPDoc を記述する（型宣言で自明な場合は省略可）。

```php
/**
 * 週報を作成する
 *
 * @param CreatePostData $data 作成データ
 * @return Post 作成された週報
 * @throws ValidationException バリデーションエラー時
 */
public function execute(CreatePostData $data): Post
{
    // ...
}
```

### インラインコメント

複雑なロジックには日本語でコメントを記述する。

```php
public function execute(CreatePostData $data): Post
{
    // 1. 重複チェック
    $existingReport = $this->repository->findByUserAndWeek(
        $data->userId,
        $data->weekStartDate
    );

    if ($existingReport !== null) {
        throw ValidationException::withMessages([
            'week_start_date' => ['A report for this week already exists.'],
        ]);
    }

    // 2. ビジネスルールのバリデーション
    if ($data->status === PostStatus::Submitted) {
        $this->validateSubmission($data);
    }

    // 3. データ作成
    return $this->repository->create(...);
}
```

---

## Laravel Pint 設定

### 設定ファイル（pint.json）

```json
{
    "preset": "laravel",
    "rules": {
        "blank_line_before_statement": {
            "statements": ["return"]
        },
        "method_argument_space": {
            "on_multiline": "ensure_fully_multiline"
        },
        "no_unused_imports": true,
        "ordered_imports": {
            "sort_algorithm": "alpha"
        }
    }
}
```

### 実行コマンド

```bash
# 整形実行
./vendor/bin/pint

# 変更されたファイルのみ
./vendor/bin/pint --dirty

# テストのみ（整形しない）
./vendor/bin/pint --test

# 特定のディレクトリのみ
./vendor/bin/pint app/UseCases
```

---

## コーディング規約チェックリスト

### クラス定義

- [ ] `declare(strict_types=1)` を宣言している
- [ ] 適切な命名規則を使用している
- [ ] `final` を適切に使用している
- [ ] DTO に `readonly` を使用している

### メソッド定義

- [ ] すべての public メソッドに型宣言がある
- [ ] Nullable 型は `?` を使用している
- [ ] 配列型は PHPDoc で明示している
- [ ] 適切なメソッド命名規則を使用している

### コード品質

- [ ] マジックナンバーを使用していない
- [ ] Early Return を使用している
- [ ] 空の catch ブロックがない
- [ ] 複雑なロジックにコメントがある

### 依存関係

- [ ] レイヤー間の依存ルールを守っている
- [ ] deptrac でチェックしている
- [ ] 循環参照がない
