# DTOs（Data Transfer Objects）- Laravel Data

## 概要

Laravel Data（spatie/laravel-data）を使用して、型安全なデータ転送オブジェクト（DTO）を実装する。

### 主な機能

- **型安全なデータ転送**
- **不変性の保証**（`readonly`）
- **スネークケース/キャメルケースの自動変換**
- **TypeScript型の自動生成**
- **バリデーション統合**

---

## インストール

```bash
composer require spatie/laravel-data
composer require spatie/laravel-typescript-transformer

php artisan vendor:publish --provider="Spatie\LaravelTypeScriptTransformer\TypeScriptTransformerServiceProvider"
```

---

## 基本実装

### DTO定義

```php
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Exists;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
class CreatePostData extends Data
{
    public function __construct(
        #[Exists(User::class, 'id')]
        public readonly int $userId,
        public readonly string $weekStartDate,
        #[Max(255)]
        public readonly string $title,
        #[Max(1000)]
        public readonly ?string $memo,
        public readonly PostStatus $status,
        /** @var array<TagValueData> */
        #[DataCollectionOf(TagValueData::class)]
        public readonly array $tagValues,
    ) {}
}
```

### ネストされたDTO

```php
#[TypeScript()]
class TagValueData extends Data
{
    public function __construct(
        #[Exists(Tag::class, 'id')]
        public int $tagId,
        #[Max(255)]
        public string $value,
    ) {}
}
```

---

## 使用パターン

### パターン1: FormRequest経由（推奨）

**FormRequest**でバリデーションを実施し、**DTO変換メソッド**で Laravel Data に変換する。

```php
class StorePostRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'week_start_date' => ['required', 'date'],
            'title' => ['required', 'string', 'max:255'],
            'memo' => ['nullable', 'string'],
            'status' => ['required', Rule::enum(PostStatus::class)],
            'tag_values' => ['required', 'array', 'min:1'],
            'tag_values.*.tag_id' => ['required', 'integer', 'exists:tags,id'],
            'tag_values.*.value' => ['required'],
        ];
    }

    /**
     * DTOへの変換メソッド
     */
    public function getCreatePostData(): CreatePostData
    {
        return CreatePostData::from([
            'user_id' => auth()->id(),
            'week_start_date' => $this->input('week_start_date'),
            'title' => $this->input('title'),
            'memo' => $this->input('memo'),
            'status' => $this->input('status'),
            'tag_values' => array_map(
                fn (array $tagValue) => TagValueData::from($tagValue),
                $this->input('tag_values', [])
            ),
        ]);
    }
}
```

**Controller**:

```php
public function store(StorePostRequest $request): JsonResponse
{
    $data = $request->getCreatePostData();
    $post = $this->createPostUseCase->execute($data);

    return response()->json([
        'data' => new PostResource($post),
    ], 201);
}
```

### パターン2: DTOに直接バリデーション統合

DTOにバリデーションルールを含め、Controller で直接受け取る。

```php
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\StringType;

#[TypeScript()]
class CreatePostData extends Data
{
    public function __construct(
        #[Required, Exists(User::class, 'id')]
        public readonly int $userId,
        #[Required, StringType, Max(255)]
        public readonly string $title,
        // ...
    ) {}
}
```

**Controller**（FormRequest不要）:

```php
// routes/api.php
Route::post('/weekly-reports', function (CreatePostData $data) {
    // バリデーションは自動的に実行される
    // $data は型安全な DTO インスタンス
    return response()->json($data->toArray());
});
```

**注意**: 本プロジェクトでは**パターン1（FormRequest経由）を推奨**する。

---

## TypeScript型生成

### 設定（config/typescript-transformer.php）

```php
return [
    'transformers' => [
        App\Utils\ModelTransformer::class,
        Spatie\LaravelTypeScriptTransformer\Transformers\SpatieStateTransformer::class,
        Spatie\TypeScriptTransformer\Transformers\EnumTransformer::class,
        Spatie\LaravelTypeScriptTransformer\Transformers\DtoTransformer::class,
    ],

    'output_file' => resource_path('js/types/generated.d.ts'),

    'writer' => Spatie\TypeScriptTransformer\Writers\TypeDefinitionWriter::class,

    'transform_to_native_enums' => false,

    'transform_null_to_optional' => true,
];
```

### 型生成コマンド

```bash
php artisan typescript:transform
```

### 生成結果

```typescript
// resources/js/types/generated.d.ts
declare namespace App.Data {
  export type CreatePostData = {
    user_id: number;
    week_start_date: string;
    title: string;
    memo?: string;
    status: App.Enums.PostStatus;
    tag_values: Array<App.Data.TagValueData>;
  };

  export type TagValueData = {
    tag_id: number;
    value: string;
  };
}
```

---

## スネークケース/キャメルケース変換

### 自動変換の有効化

```php
#[MapName(SnakeCaseMapper::class)]
class CreatePostData extends Data
{
    public function __construct(
        public readonly int $userId,      // PHP: camelCase
        public readonly string $title,
    ) {}
}
```

### フロントエンドからの送信

```typescript
// React側（キャメルケース）
const data = {
  userId: 1,
  weekStartDate: '2025-10-13',
  title: 'Week 42 Report',
};

// Laravel側（スネークケース）に自動変換される
// {
//   user_id: 1,
//   week_start_date: '2025-10-13',
//   title: 'Week 42 Report',
// }
```

---

## DTO操作メソッド

### データ変換

```php
// 配列から生成
$data = CreatePostData::from([
    'user_id' => 1,
    'title' => 'Test',
    'tag_values' => [
        ['tag_id' => 1, 'value' => '100'],
    ],
]);

// リクエストから生成
$data = CreatePostData::from($request);

// Modelから生成
$data = CreatePostData::from($post);
```

### 部分的なデータ取得

```php
// 一部のプロパティのみ取得
$partial = $data->only('title', 'memo');

// 一部のプロパティを除外
$rest = $data->except('tag_values');
```

### 配列/JSON変換

```php
// 配列に変換
$array = $data->toArray();

// JSONに変換
$json = $data->toJson();
```

---

## バリデーション属性

### よく使うバリデーション属性

```php
use Spatie\LaravelData\Attributes\Validation\*;

#[TypeScript()]
class ExampleData extends Data
{
    public function __construct(
        #[Required]
        public string $requiredField,

        #[Max(255)]
        public string $maxLength,

        #[Email]
        public string $emailField,

        #[Url]
        public string $urlField,

        #[Exists(User::class, 'id')]
        public int $userId,

        #[Unique(User::class, 'email')]
        public string $uniqueEmail,

        #[Min(0), Max(100)]
        public int $percentage,

        #[ArrayType, MinItems(1), MaxItems(10)]
        public array $items,

        #[StringType, Regex('/^[A-Za-z0-9]+$/')]
        public string $alphanumeric,

        #[Date]
        public string $dateField,

        #[Nullable, StringType]
        public ?string $optionalField,
    ) {}
}
```

---

## カスタムキャスト

### カスタムキャストの定義

```php
use Spatie\LaravelData\Casts\Cast;
use Spatie\LaravelData\Support\DataProperty;

class CarbonCast implements Cast
{
    public function cast(DataProperty $property, mixed $value, array $context): Carbon
    {
        return Carbon::parse($value);
    }
}
```

### 使用例

```php
use Spatie\LaravelData\Attributes\WithCast;

#[TypeScript()]
class PostData extends Data
{
    public function __construct(
        #[WithCast(CarbonCast::class)]
        public Carbon $weekStartDate,
    ) {}
}
```

---

## 命名規則

### DTO命名パターン

| 種類 | 命名規則 | 例 |
|------|---------|-----|
| **作成用** | `Create[Resource]Data` | `CreatePostData` |
| **更新用** | `Update[Resource]Data` | `UpdatePostData` |
| **検索用** | `Search[Resource]sData` | `SearchPostsData` |
| **ネストDTO** | `[Property]Data` | `TagValueData` |

---

## ベストプラクティス

### 1. readonly の使用

すべてのプロパティは `readonly` とし、不変性を保証する。

```php
public function __construct(
    public readonly int $userId,    // ✅ Good
    public int $userId,              // ❌ Bad
) {}
```

### 2. 型宣言の明示

すべてのプロパティに型を明示する。

```php
public function __construct(
    public readonly int $userId,         // ✅ Good
    public readonly $userId,             // ❌ Bad
) {}
```

### 3. Nullable の適切な使用

Nullable なプロパティは `?` を使用する。

```php
public function __construct(
    public readonly ?string $memo,       // ✅ Good (nullable)
    public readonly string $title,       // ✅ Good (required)
) {}
```

### 4. ネストしたDTOの型定義

配列型は PHPDoc で明示する。

```php
public function __construct(
    /** @var array<TagValueData> */
    #[DataCollectionOf(TagValueData::class)]
    public readonly array $tagValues,    // ✅ Good
) {}
```

### 5. TypeScript型生成

すべての DTO に `#[TypeScript()]` を付与する。

```php
#[TypeScript()]
class CreatePostData extends Data
{
    // ...
}
```

---

## Laravel Precognition との統合

### Precognition対応のFormRequest

```php
class StorePostRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'status' => ['required', Rule::enum(PostStatus::class)],
        ];
    }

    public function getCreatePostData(): CreatePostData
    {
        return CreatePostData::from([
            'user_id' => auth()->id(),
            'title' => $this->input('title'),
            'status' => $this->input('status'),
        ]);
    }
}
```

### React側（Laravel Precognition）

```tsx
import { useForm } from 'laravel-precognition-react';

const form = useForm<App.Data.CreatePostData>(
    'post',
    route('weekly-reports.store'),
    {
        userId: 0,
        title: '',
        status: 'draft',
        tagValues: [],
    }
);

// リアルタイムバリデーション
form.validate('title');
```

**重要**: `@inertiajs/react` の `useForm` は**使用禁止**。Laravel Precognition を使用する。
