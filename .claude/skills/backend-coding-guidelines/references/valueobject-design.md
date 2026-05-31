# DTO Design - Laravel Data Patterns

## AI's Common Failure Patterns

### Pattern 1: Using Arrays Instead of DTOs

**❌ AI writes: Using arrays for data transfer**

```php
final readonly class CreatePostUseCase
{
    public function execute(array $data): Post
    {
        // No type safety
        // No validation
        // No IDE autocomplete
        return $this->repository->create(
            $data['user_id'],    // Could be anything
            $data['title'],      // Could be anything
            $data['status'],     // Could be anything
        );
    }
}
```

### Pattern 2: Missing TypeScript Generation

**❌ AI writes: DTO without TypeScript attribute**

```php
class CreatePostData extends Data
{
    public function __construct(
        public int $userId,
        public string $title,
    ) {}
}
// No #[TypeScript()] = No frontend type safety
```

---

## ✅ Correct Pattern: Laravel Data with TypeScript

### Basic DTO Implementation

```php
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final readonly class CreatePostData extends Data
{
    public function __construct(
        public int $userId,
        public string $weekStartDate,
        public string $title,
        public ?string $memo,
        public PostStatus $status,
        /** @var array<TagValueData> */
        #[DataCollectionOf(TagValueData::class)]
        public array $tagValues,
    ) {}
}
```

### Usage in UseCase

```php
final readonly class CreatePostUseCase
{
    public function __construct(
        private PostRepositoryInterface $postRepository,
    ) {}

    public function execute(CreatePostData $data): Post
    {
        // Type-safe access
        // IDE autocomplete
        // Validated data
        return $this->postRepository->create(
            $data->userId,
            $data->weekStartDate,
            $data->title,
            $data->memo,
            $data->status,
            $data->tagValues,
        );
    }
}
```

---

## Key Design Principles

### 1. Required Attributes

Every DTO must have these attributes:

```php
#[TypeScript()]                    // For TypeScript generation
#[MapName(SnakeCaseMapper::class)] // For snake_case/camelCase conversion
final readonly class ExampleData extends Data
{
    // ...
}
```

### 2. Readonly and Final

All DTOs must be `final readonly` for immutability:

```php
// ✅ Correct
final readonly class CreatePostData extends Data

// ❌ Wrong - mutable
class CreatePostData extends Data
```

### 3. Constructor Property Promotion

Use constructor property promotion with explicit types:

```php
public function __construct(
    public int $userId,           // Required int
    public string $title,         // Required string
    public ?string $memo,         // Nullable string
    public PostStatus $status,    // Enum type
) {}
```

### 4. Array Type Annotation

For array properties, use PHPDoc and `#[DataCollectionOf]`:

```php
/** @var array<TagValueData> */
#[DataCollectionOf(TagValueData::class)]
public array $tagValues,
```

---

## Common DTO Patterns

### Input DTO (FormRequest → UseCase)

```php
#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final readonly class CreatePostData extends Data
{
    public function __construct(
        public int $userId,
        public string $weekStartDate,
        public string $title,
        public ?string $memo,
        public PostStatus $status,
        /** @var array<TagValueData> */
        #[DataCollectionOf(TagValueData::class)]
        public array $tagValues,
    ) {}
}
```

### Nested DTO

```php
#[TypeScript()]
final readonly class TagValueData extends Data
{
    public function __construct(
        public int $tagId,
        public string $value,
    ) {}
}
```

### Search/Filter DTO

```php
#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final readonly class SearchPostsData extends Data
{
    public function __construct(
        public ?int $userId,
        public ?string $q,
        public ?PostStatus $status,
        public ?string $weekStartDate,
        public int $page = 1,
        public int $perPage = 20,
    ) {}
}
```

### Update DTO (Partial Update)

```php
#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final readonly class UpdatePostData extends Data
{
    public function __construct(
        public int $id,
        public string $weekStartDate,
        public string $title,
        public ?string $memo,
        public PostStatus $status,
        /** @var array<TagValueData> */
        #[DataCollectionOf(TagValueData::class)]
        public array $tagValues,
    ) {}
}
```

---

## FormRequest to DTO Conversion

### Standard Pattern

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
     * Convert validated request to DTO
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

### Controller Usage

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

---

## TypeScript Generation

### Generated Types

Running `php artisan typescript:transform` generates:

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

    export type SearchPostsData = {
        user_id?: number;
        q?: string;
        status?: App.Enums.PostStatus;
        week_start_date?: string;
        page: number;
        per_page: number;
    };
}
```

### React Usage

```tsx
import { useForm } from 'laravel-precognition-react';

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
```

---

## Naming Conventions

| Purpose | Naming Pattern | Example |
|---------|---------------|---------|
| Create input | `Create[Resource]Data` | `CreatePostData` |
| Update input | `Update[Resource]Data` | `UpdatePostData` |
| Search/filter | `Search[Resource]sData` | `SearchPostsData` |
| Nested data | `[Property]Data` | `TagValueData` |

---

## Checklist: DTO Design

Before considering a DTO implementation complete, verify:

- [ ] Has `#[TypeScript()]` attribute
- [ ] Has `#[MapName(SnakeCaseMapper::class)]` attribute
- [ ] Class is `final readonly`
- [ ] Extends `Spatie\LaravelData\Data`
- [ ] All properties have explicit types
- [ ] Nullable properties use `?` prefix
- [ ] Array properties have PHPDoc type annotation
- [ ] Array properties have `#[DataCollectionOf()]` attribute
- [ ] FormRequest has `get[Action][Resource]Data()` method
- [ ] Naming follows convention

---

## Comparison: ValueObject vs Laravel Data

| Aspect | ValueObject (DDD) | Laravel Data (7-Layer) |
|--------|-------------------|------------------------|
| Purpose | Domain modeling | Data transfer |
| Validation | Factory method | FormRequest |
| Immutability | Private constructor | `readonly` class |
| Type generation | Manual | `#[TypeScript()]` |
| Framework coupling | None | Laravel |
| Complexity | High | Low |
| Use case | Domain boundaries | API/Form data |

**Recommendation**: Use Laravel Data for DTOs in 7-layer architecture. It provides TypeScript generation, automatic validation integration, and simpler implementation.
