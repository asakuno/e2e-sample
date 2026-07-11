# UseCase Structure - Business Logic and Orchestration

## AI's Common Failure Patterns

### Pattern 1: Business Logic in Controller

**❌ AI writes: Logic in controller**

```php
class UserController extends Controller
{
    public function store(Request $request)
    {
        // Business logic in controller - WRONG!
        $user = new User();
        $user->name = $request->input('name');
        $user->email = $request->input('email');
        $user->save();

        return redirect()->route('users.index');
    }
}
```

**Problems**:
- Business logic mixed with HTTP handling
- Hard to test (requires HTTP request)
- Can't reuse logic (CLI, API, etc.)
- Violates Single Responsibility Principle

### Pattern 2: UseCase Contains HTTP-Specific Logic

**❌ AI writes: UseCase with HTTP response logic**

```php
final class CreateUserUseCase
{
    public function execute(CreateUserData $data): JsonResponse
    {
        // HTTP-specific return type - WRONG!
        $user = User::create([
            'name' => $data->name,
            'email' => $data->email,
        ]);

        return response()->json(['id' => $user->id], 201);
    }
}
```

**Problems**:
- UseCase tied to HTTP layer
- Can't reuse for CLI or other contexts
- Breaks layer separation
- Hard to test without HTTP

---

## ✅ Correct Pattern: UseCase with Laravel Data DTOs

### Complete UseCase Implementation

```php
// app/Data/User/CreateUserData.php
#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class CreateUserData extends Data
{
    public function __construct(
        #[Max(255)]
        public string $name,
        #[Email, Max(255)]
        public string $email,
        #[Min(8)]
        public string $password,
    ) {}
}

// app/UseCases/User/CreateUserUseCase.php
final class CreateUserUseCase
{
    public function __construct(
        private UserRepositoryInterface $repository,
    ) {}

    public function execute(CreateUserData $data): User
    {
        // Business rule validation
        $existing = $this->repository->findByEmail($data->email);
        if ($existing !== null) {
            throw ValidationException::withMessages([
                'email' => ['This email is already registered.'],
            ]);
        }

        // Create via Repository
        return $this->repository->create(
            $data->name,
            $data->email,
            $data->password
        );
    }
}

// app/Http/Controllers/Api/UserController.php
class UserController extends Controller
{
    public function __construct(
        private CreateUserUseCase $createUserUseCase,
    ) {}

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->getCreateUserData();
        $user = $this->createUserUseCase->execute($data);

        return response()->json([
            'data' => new UserResource($user),
        ], 201);
    }
}
```

---

## UseCase Patterns

### Simple Create UseCase

```php
// app/Data/Post/CreatePostData.php
#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class CreatePostData extends Data
{
    public function __construct(
        public int $userId,
        public string $weekStartDate,
        #[Max(255)]
        public string $title,
        #[Max(1000)]
        public ?string $memo,
        public PostStatus $status,
        /** @var array<TagValueData> */
        #[DataCollectionOf(TagValueData::class)]
        public array $tagValues,
    ) {}
}

// app/UseCases/Post/CreatePostUseCase.php
final class CreatePostUseCase
{
    public function __construct(
        private PostRepositoryInterface $postRepository,
    ) {}

    public function execute(CreatePostData $data): Post
    {
        // Business rule: Check for duplicates
        $existing = $this->postRepository->findByUserAndWeek(
            $data->userId,
            $data->weekStartDate
        );

        if ($existing !== null) {
            throw ValidationException::withMessages([
                'week_start_date' => ['A post for this week already exists.'],
            ]);
        }

        // Convert nested DTOs to array
        $tagValuesArray = array_map(fn ($tag) => [
            'tag_id' => $tag->tagId,
            'value' => $tag->value,
        ], $data->tagValues);

        // Create via Repository
        return $this->postRepository->create(
            $data->userId,
            $data->weekStartDate,
            $data->title,
            $data->memo,
            $data->status,
            $tagValuesArray
        );
    }
}
```

### List/Query UseCase with Pagination

```php
// app/Data/Post/SearchPostsData.php
#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class SearchPostsData extends Data
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

// app/UseCases/Post/GetPostsUseCase.php
final class GetPostsUseCase
{
    public function __construct(
        private PostRepositoryInterface $repository,
    ) {}

    public function execute(SearchPostsData $data): LengthAwarePaginator
    {
        return $this->repository->search(
            userId: $data->userId,
            query: $data->q,
            status: $data->status,
            weekStartDate: $data->weekStartDate,
            page: $data->page,
            perPage: $data->perPage
        );
    }
}
```

### Update UseCase

```php
// app/Data/Post/UpdatePostData.php
#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class UpdatePostData extends Data
{
    public function __construct(
        public int $id,
        public string $weekStartDate,
        #[Max(255)]
        public string $title,
        #[Max(1000)]
        public ?string $memo,
        public PostStatus $status,
        /** @var array<TagValueData> */
        #[DataCollectionOf(TagValueData::class)]
        public array $tagValues,
    ) {}
}

// app/UseCases/Post/UpdatePostUseCase.php
final class UpdatePostUseCase
{
    public function __construct(
        private PostRepositoryInterface $repository,
    ) {}

    public function execute(UpdatePostData $data, int $currentUserId): Post
    {
        $post = $this->repository->findById($data->id);

        if ($post === null) {
            throw new PostNotFoundException($data->id);
        }

        // Business rule: Ownership check
        if ($post->user_id !== $currentUserId) {
            throw new UnauthorizedAccessException('You cannot update this post.');
        }

        // Convert nested DTOs to array
        $tagValuesArray = array_map(fn ($tag) => [
            'tag_id' => $tag->tagId,
            'value' => $tag->value,
        ], $data->tagValues);

        return $this->repository->update(
            $data->id,
            $data->weekStartDate,
            $data->title,
            $data->memo,
            $data->status,
            $tagValuesArray
        );
    }
}
```

### Delete UseCase

```php
// app/UseCases/Post/DeletePostUseCase.php
final class DeletePostUseCase
{
    public function __construct(
        private PostRepositoryInterface $repository,
    ) {}

    public function execute(int $id, int $currentUserId): bool
    {
        $post = $this->repository->findById($id);

        if ($post === null) {
            throw new PostNotFoundException($id);
        }

        // Business rule: Ownership check
        if ($post->user_id !== $currentUserId) {
            throw new UnauthorizedAccessException('You cannot delete this post.');
        }

        return $this->repository->delete($id);
    }
}
```

### UseCase with Status Transition

```php
// app/UseCases/Post/SubmitPostUseCase.php
final class SubmitPostUseCase
{
    public function __construct(
        private PostRepositoryInterface $repository,
    ) {}

    public function execute(int $postId, int $currentUserId): Post
    {
        $post = $this->repository->findById($postId);

        if ($post === null) {
            throw new PostNotFoundException($postId);
        }

        // Business rule: Ownership check
        if ($post->user_id !== $currentUserId) {
            throw new UnauthorizedAccessException('You cannot submit this post.');
        }

        // Business rule: Already submitted check
        if ($post->status === PostStatus::Submitted) {
            throw ValidationException::withMessages([
                'status' => ['This post has already been submitted.'],
            ]);
        }

        return $this->repository->updateStatus($postId, PostStatus::Submitted);
    }
}
```

### UseCase with Service Dependency

```php
// app/UseCases/Post/ExportPostUseCase.php
final class ExportPostUseCase
{
    public function __construct(
        private PostRepositoryInterface $repository,
        private PostExportService $exportService,
    ) {}

    public function execute(int $postId, int $currentUserId): string
    {
        $post = $this->repository->findById($postId);

        if ($post === null) {
            throw new PostNotFoundException($postId);
        }

        // Business rule: Ownership or shared access check
        if ($post->user_id !== $currentUserId &&
            !$post->sharedUsers()->where('user_id', $currentUserId)->exists()) {
            throw new UnauthorizedAccessException('You cannot export this post.');
        }

        // Delegate to Service
        return $this->exportService->exportToCsv($post);
    }
}
```

---

## Key Design Principles

### 1. Single Responsibility
- One UseCase per business operation
- Named by action: `Create`, `Update`, `Delete`, `Get`, `Submit`, etc.
- Clear purpose and boundary

### 2. Laravel Data DTOs
- Use `spatie/laravel-data` for type-safe DTOs
- `#[TypeScript()]` for frontend type generation
- `#[MapName(SnakeCaseMapper::class)]` for case conversion

### 3. Return Types
- Simple operations: Return Eloquent Model
- List operations: Return `Collection` or `LengthAwarePaginator`
- Delete operations: Return `bool`
- Never return HTTP-specific types

### 4. Dependency Injection
- Constructor injection for dependencies
- Depends on Repository Interface (not implementation)
- Uses Service for complex operations

### 5. Business Logic Location
- Validation rules → FormRequest
- Business rules → UseCase
- Data access → Repository
- Reusable logic → Service

### 6. Transaction Management
- Simple operations: Repository handles transaction
- Complex operations: UseCase wraps in `DB::transaction()`

---

## Controller Integration

### API Controller

```php
// app/Http/Controllers/Api/PostController.php
class PostController extends Controller
{
    public function __construct(
        private GetPostsUseCase $getPostsUseCase,
        private CreatePostUseCase $createPostUseCase,
        private UpdatePostUseCase $updatePostUseCase,
        private DeletePostUseCase $deletePostUseCase,
    ) {}

    public function index(SearchPostsRequest $request): JsonResponse
    {
        $data = $request->getSearchPostsData();
        $posts = $this->getPostsUseCase->execute($data);

        return response()->json([
            'data' => PostResource::collection($posts),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ],
        ]);
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $data = $request->getCreatePostData();
        $post = $this->createPostUseCase->execute($data);

        return response()->json([
            'data' => new PostResource($post),
        ], 201);
    }

    public function update(
        UpdatePostRequest $request,
        Post $post
    ): JsonResponse {
        $this->authorize('update', $post);

        $data = $request->getUpdatePostData();
        $updatedPost = $this->updatePostUseCase->execute($data, auth()->id());

        return response()->json([
            'data' => new PostResource($updatedPost),
        ]);
    }

    public function destroy(Post $post): JsonResponse
    {
        $this->authorize('delete', $post);

        $this->deletePostUseCase->execute($post->id, auth()->id());

        return response()->json(null, 204);
    }
}
```

### Web Controller (Inertia)

```php
// app/Http/Controllers/Web/PostPageController.php
class PostPageController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Post/Index', [
            'statusOptions' => PostStatus::toSelectArray(),
            'filters' => $request->only(['q', 'status']),
        ]);
        // Dynamic data fetched via API on frontend
    }

    public function create(): Response
    {
        return Inertia::render('Post/Create', [
            'statusOptions' => PostStatus::toSelectArray(),
        ]);
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

## Checklist: UseCase Design

Before considering a UseCase implementation complete, verify:

- [ ] Class is marked as `final`
- [ ] Named `{Action}{Resource}UseCase`
- [ ] Uses Laravel Data DTO for input
- [ ] Uses constructor injection for dependencies
- [ ] Depends on Repository Interface (not implementation)
- [ ] Returns Eloquent Model or Collection (not HTTP response)
- [ ] No HTTP-specific logic (Request, Response, redirect)
- [ ] No direct Eloquent queries (use Repository)
- [ ] Single responsibility (one business operation)
- [ ] Business rules are validated in UseCase
- [ ] Throws appropriate exceptions for error cases

---

## Why This Matters

**Without proper UseCase structure**, code suffers from:
- Tight coupling between layers
- Business logic scattered across Controllers
- Hard to test without HTTP
- Can't reuse logic for CLI/API

**With proper UseCase structure**, you get:
- Clear layer separation
- Business logic in one place
- Testability (mock Repository)
- Reusability (CLI, API, Web)
- Type safety with Laravel Data
- TypeScript types for frontend
