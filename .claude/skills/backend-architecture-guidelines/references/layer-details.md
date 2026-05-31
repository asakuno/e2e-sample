# Layer Responsibilities - Detailed Guide

This document provides detailed explanations and code examples for each layer in the 7-layer architecture.

## Table of Contents
- [Presentation Layer (Controllers)](#presentation-layer-controllers)
- [Request Layer (Form Requests)](#request-layer-form-requests)
- [UseCase Layer (Business Logic)](#usecase-layer-business-logic)
- [Service Layer (Shared Logic)](#service-layer-shared-logic)
- [Repository Layer (Data Access)](#repository-layer-data-access)
- [Model Layer (Eloquent Models)](#model-layer-eloquent-models)
- [Resource Layer (Response Transformation)](#resource-layer-response-transformation)

---

## Presentation Layer (Controllers)

**Purpose**: HTTP request/response handling

**Contains**:
- `Controllers/Api/` - REST API controllers
- `Controllers/Web/` - Inertia.js page controllers
- `Middleware/` - Request pipeline

**Responsibilities**:
- Receive HTTP request
- Call FormRequest for validation
- Call appropriate UseCase
- Return HTTP response (Inertia, JSON, Redirect)

**NOT Responsible For**:
- Business logic
- Direct database access
- Data transformation logic (use Resource layer)

### Example: API Controller

```php
// ✅ Controller - thin, delegates to UseCase
final class PostController extends Controller
{
    public function __construct(
        private CreatePostUseCase $createPostUseCase,
    ) {}

    public function store(StorePostRequest $request): JsonResponse
    {
        $data = $request->getCreatePostData();
        $post = $this->createPostUseCase->execute($data);

        return response()->json([
            'data' => new PostResource($post),
        ], 201);
    }
}
```

### Example: Web Page Controller

```php
// ✅ Web Controller - provides static data for Inertia
final class PostPageController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Post/Index', [
            'statusOptions' => PostStatus::toSelectArray(),  // Static data only
        ]);
        // Dynamic data fetched via API by React
    }

    public function edit(int $id): Response
    {
        return Inertia::render('Post/Edit', [
            'postId' => $id,
            'statusOptions' => PostStatus::toSelectArray(),
        ]);
    }
}
```

---

## Request Layer (Form Requests)

**Purpose**: Input validation and DTO conversion

**Contains**:
- `Requests/` - FormRequest classes

**Responsibilities**:
- Validate input format and business rules
- Convert validated input to DTO
- Provide custom error messages

**NOT Responsible For**:
- Business logic
- Database access
- Authorization (use Policy)

### Example: FormRequest with DTO Conversion

```php
// ✅ FormRequest - validation + DTO conversion
final class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;  // Authorization in Policy
    }

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

---

## UseCase Layer (Business Logic)

**Purpose**: Application-specific business operations

**Contains**:
- `UseCases/` - Use case classes

**Responsibilities**:
- Implement business logic
- Coordinate Repository and Service calls
- Transaction management (when needed)
- Domain validation (business rules)

**NOT Responsible For**:
- HTTP concerns
- Database query details (use Repository)
- Shared logic (use Service)

### Example: UseCase Implementation

```php
// ✅ UseCase - business logic orchestration
final readonly class CreatePostUseCase
{
    public function __construct(
        private PostRepositoryInterface $postRepository,
        private TagRepositoryInterface $tagRepository,
    ) {}

    public function execute(CreatePostData $data): Post
    {
        // 1. Domain validation (duplicate check)
        $existingPost = $this->postRepository->findByUserAndWeek(
            $data->userId,
            $data->weekStartDate
        );

        if ($existingPost !== null) {
            throw ValidationException::withMessages([
                'week_start_date' => ['A report for this week already exists.'],
            ]);
        }

        // 2. Business rule validation
        if ($data->status === PostStatus::Submitted) {
            $this->validateSubmission($data);
        }

        // 3. Create through repository
        return $this->postRepository->create(
            $data->userId,
            $data->weekStartDate,
            $data->title,
            $data->memo,
            $data->status,
            $data->tagValues
        );
    }

    private function validateSubmission(CreatePostData $data): void
    {
        // Business validation logic
    }
}
```

---

## Service Layer (Shared Logic)

**Purpose**: Reusable business logic across UseCases

**Contains**:
- `Services/` - Service classes

**Responsibilities**:
- Implement shared business logic
- External service integrations
- Complex calculations
- Export/Import operations

**NOT Responsible For**:
- HTTP concerns
- Use case orchestration

### Example: Service Implementation

```php
// ✅ Service - shared business logic
final class PostExportService
{
    public function exportToCsv(Post $post): string
    {
        $post->load(['tags', 'user']);

        $filename = 'exports/post_' . $post->id . '_' . time() . '.csv';

        // UTF-8 BOM for Excel compatibility
        $csv = "\xEF\xBB\xBF";

        // Headers
        $headers = ['Week', 'Title', 'Status'];
        foreach ($post->tags as $tag) {
            $headers[] = $tag->name;
        }
        $csv .= $this->arrayToCsvLine($headers);

        // Data row
        $row = [
            $post->week_start_date->format('Y-m-d'),
            $post->title,
            $post->status->label(),
        ];

        foreach ($post->tags as $tag) {
            $row[] = $tag->pivot->value ?? '';
        }

        $csv .= $this->arrayToCsvLine($row);

        Storage::disk('local')->put($filename, $csv);

        return $filename;
    }

    private function arrayToCsvLine(array $array): string
    {
        $fp = fopen('php://temp', 'r+');
        fputcsv($fp, $array);
        rewind($fp);
        $line = stream_get_contents($fp);
        fclose($fp);

        return $line;
    }
}
```

---

## Repository Layer (Data Access)

**Purpose**: Data access abstraction

**Contains**:
- `Repositories/` - Repository interfaces and implementations

**Responsibilities**:
- Abstract database operations
- Encapsulate Eloquent queries
- Transaction management
- Return Eloquent Models (not DTOs)

**NOT Responsible For**:
- Business logic
- HTTP concerns

### Example: Repository Interface

```php
// ✅ Repository Interface
interface PostRepositoryInterface
{
    public function findById(int $id): ?Post;

    public function findByUserAndWeek(int $userId, string $weekStartDate): ?Post;

    public function create(
        int $userId,
        string $weekStartDate,
        string $title,
        ?string $memo,
        PostStatus $status,
        array $tagValues
    ): Post;

    public function update(
        int $id,
        string $weekStartDate,
        string $title,
        ?string $memo,
        PostStatus $status,
        array $tagValues
    ): Post;

    public function delete(int $id): bool;
}
```

### Example: Repository Implementation

```php
// ✅ Repository Implementation - technical details
final class PostRepository implements PostRepositoryInterface
{
    public function findById(int $id): ?Post
    {
        return Post::find($id);
    }

    public function findByUserAndWeek(int $userId, string $weekStartDate): ?Post
    {
        return Post::where('user_id', $userId)
            ->where('week_start_date', $weekStartDate)
            ->first();
    }

    public function create(
        int $userId,
        string $weekStartDate,
        string $title,
        ?string $memo,
        PostStatus $status,
        array $tagValues
    ): Post {
        return DB::transaction(function () use (
            $userId,
            $weekStartDate,
            $title,
            $memo,
            $status,
            $tagValues
        ) {
            $post = Post::create([
                'user_id' => $userId,
                'week_start_date' => $weekStartDate,
                'title' => $title,
                'memo' => $memo,
                'status' => $status,
            ]);

            foreach ($tagValues as $tagData) {
                $post->tags()->attach($tagData['tag_id'], ['value' => $tagData['value']]);
            }

            return $post->fresh(['tags']);
        });
    }
}
```

---

## Model Layer (Eloquent Models)

**Purpose**: Data representation and relationships

**Contains**:
- `Models/` - Eloquent Model classes

**Responsibilities**:
- Define table structure
- Define relationships
- Define casts and accessors
- Define query scopes

**NOT Responsible For**:
- Business logic (use UseCase)
- Data access abstraction (use Repository)
- Validation (use FormRequest)

### Example: Model Implementation

```php
// ✅ Model - data representation
#[TypeScript()]
class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'week_start_date',
        'title',
        'memo',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'week_start_date' => 'date',
            'status' => PostStatus::class,
        ];
    }

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'post_tag')
            ->withPivot('value')
            ->withTimestamps();
    }

    // Query Scopes
    public function scopeByStatus(Builder $query, PostStatus $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopeByUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }
}
```

---

## Resource Layer (Response Transformation)

**Purpose**: JSON response transformation

**Contains**:
- `Resources/` - API Resource classes

**Responsibilities**:
- Transform Models to JSON
- Control response structure
- Handle conditional loading (lazy loading)
- Filter sensitive data

**NOT Responsible For**:
- Business logic
- Database access

### Example: Resource Implementation

```php
// ✅ Resource - response transformation
class PostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'week_start_date' => $this->week_start_date->format('Y-m-d'),
            'title' => $this->title,
            'memo' => $this->memo,
            'status' => $this->status->value,

            // Conditional loading (lazy loading)
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ]),

            // Computed properties
            'is_owner' => $request->user()?->id === $this->user_id,

            // Nested relationships
            'tags' => $this->whenLoaded('tags', fn () =>
                $this->tags->map(fn ($tag) => [
                    'id' => $tag->id,
                    'name' => $tag->name,
                    'value' => $tag->pivot->value,
                ])
            ),

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
```

---

## Layer Dependency Rules

```
┌─────────────────────────────────────────┐
│  Presentation (Controllers)             │ → Request, UseCase, Resource
├─────────────────────────────────────────┤
│  Request (Form Requests)                │ → DTO (Laravel Data)
├─────────────────────────────────────────┤
│  UseCase (Business Logic)               │ → Repository, Service, Policy
├─────────────────────────────────────────┤
│  Service (Shared Logic)                 │ → Repository, Model
├─────────────────────────────────────────┤
│  Repository (Data Access)               │ → Model
├─────────────────────────────────────────┤
│  Model (Eloquent)                       │ → (no dependencies)
├─────────────────────────────────────────┤
│  Resource (JSON Transformation)         │ → Model
└─────────────────────────────────────────┘
```

**Prohibited Dependencies**:
- Model → Repository (reverse direction)
- UseCase → Resource
- Controller → Model directly (use Repository via UseCase)
