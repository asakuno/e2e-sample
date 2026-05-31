# Anti-Patterns to Avoid

This document describes common architectural anti-patterns in 7-layer architecture and their correct implementations.

## Table of Contents
- [1. Fat Model](#1-fat-model)
- [2. God UseCase](#2-god-usecase)
- [3. Controller Business Logic](#3-controller-business-logic)
- [4. Leaky Abstractions](#4-leaky-abstractions)
- [5. UseCase Returning Resource](#5-usecase-returning-resource)

---

## 1. Fat Model

### Problem

A fat model is a model that contains business logic, authorization, and validation. This violates the Single Responsibility Principle and makes the code difficult to test and maintain.

### ❌ Anti-Pattern: Model with Business Logic

```php
// Model with too many responsibilities
class Post extends Model
{
    protected $fillable = ['user_id', 'title', 'status'];

    protected function casts(): array
    {
        return ['status' => PostStatus::class];
    }

    // ❌ Business logic in Model
    public function submit(): void
    {
        if ($this->status === PostStatus::Submitted) {
            throw new \Exception('Already submitted');
        }
        $this->status = PostStatus::Submitted;
        $this->save();
    }

    // ❌ Authorization in Model
    public function canBeEditedBy(User $user): bool
    {
        return $this->user_id === $user->id;
    }

    // ❌ Validation in Model
    public function isValid(): bool
    {
        return !empty($this->title) && strlen($this->title) <= 255;
    }
}

// Controller calling Model methods
class PostController extends Controller
{
    public function submit(Post $post)
    {
        if (!$post->canBeEditedBy(auth()->user())) {  // Wrong place!
            abort(403);
        }
        $post->submit();  // Business logic in Model!
    }
}
```

**Problems**:
- Business logic is hidden in Model
- Authorization is not in Policy
- Validation is not in FormRequest
- Difficult to test without database
- Violates Single Responsibility

### ✅ Correct: Thin Model + UseCase + Policy

```php
// Model - Only data structure concerns
#[TypeScript()]
class Post extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'title', 'status'];

    protected function casts(): array
    {
        return ['status' => PostStatus::class];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Only query scopes - no business logic
    public function scopeByStatus(Builder $query, PostStatus $status): Builder
    {
        return $query->where('status', $status);
    }
}

// Policy - Authorization
class PostPolicy
{
    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }
}

// UseCase - Business logic
final readonly class SubmitPostUseCase
{
    public function __construct(
        private PostRepositoryInterface $repository,
    ) {}

    public function execute(int $postId): Post
    {
        $post = $this->repository->findById($postId);

        if ($post === null) {
            throw new PostNotFoundException($postId);
        }

        if ($post->status === PostStatus::Submitted) {
            throw ValidationException::withMessages([
                'status' => ['This post has already been submitted.'],
            ]);
        }

        return $this->repository->updateStatus($postId, PostStatus::Submitted);
    }
}

// Controller - Thin, just orchestration
class PostController extends Controller
{
    public function submit(Post $post, SubmitPostUseCase $useCase): JsonResponse
    {
        $this->authorize('update', $post);  // Policy

        $updatedPost = $useCase->execute($post->id);

        return response()->json([
            'data' => new PostResource($updatedPost),
        ]);
    }
}
```

**Benefits**:
- Clear separation of concerns
- Each layer has single responsibility
- Easy to test (UseCase with mocked Repository)
- Authorization is explicit (Policy)
- Business rules are in UseCase

---

## 2. God UseCase

### Problem

A God UseCase tries to do too many things in a single method, violating the Single Responsibility Principle. It becomes difficult to test, maintain, and understand.

### ❌ Anti-Pattern: God UseCase

```php
// UseCase doing too much
final readonly class ProcessOrderUseCase
{
    public function execute(OrderInput $input): void
    {
        // Validate inventory (50 lines)
        foreach ($input->items as $item) {
            $product = $this->productRepository->find($item->productId);
            if ($product->stock < $item->quantity) {
                throw new InsufficientStockException();
            }
            // ... more inventory logic
        }

        // Calculate prices (100 lines)
        $subtotal = 0;
        foreach ($input->items as $item) {
            $price = $this->priceCalculator->calculate($item);
            // ... discount logic, tax logic, shipping logic
            $subtotal += $price;
        }

        // Process payment (80 lines)
        $paymentResult = $this->paymentGateway->charge($subtotal);
        // ... retry logic, error handling, refund logic

        // Send notifications (60 lines)
        $this->mailer->send($customer);
        $this->smsService->send($customer);

        // ... 500+ lines total
    }
}
```

**Problems**:
- Too many responsibilities
- Difficult to test (requires many mocks)
- Hard to understand and maintain
- Changes in one area affect everything

### ✅ Correct: Focused UseCases with Services

Break down into smaller, focused UseCases and use Services for shared logic:

```php
// Focused UseCase - single responsibility
final readonly class PlaceOrderUseCase
{
    public function __construct(
        private OrderRepositoryInterface $orderRepository,
        private InventoryService $inventoryService,
        private PriceCalculationService $priceService,
    ) {}

    public function execute(PlaceOrderData $data): Order
    {
        // 1. Validate inventory (delegated to Service)
        $this->inventoryService->reserve($data->items);

        // 2. Calculate total (delegated to Service)
        $total = $this->priceService->calculateTotal($data->items);

        // 3. Create order
        $order = $this->orderRepository->create(
            $data->customerId,
            $data->items,
            $total,
        );

        // 4. Dispatch event for side effects
        event(new OrderPlaced($order));

        return $order;
    }
}

// Service - Reusable business logic
final class InventoryService
{
    public function reserve(array $items): void
    {
        foreach ($items as $item) {
            $product = $this->productRepository->find($item->productId);
            if ($product->stock < $item->quantity) {
                throw new InsufficientStockException($item->productId);
            }
        }
    }
}

// Service - Price calculation
final class PriceCalculationService
{
    public function calculateTotal(array $items): int
    {
        return collect($items)
            ->sum(fn ($item) => $this->calculateItemPrice($item));
    }

    private function calculateItemPrice(OrderItem $item): int
    {
        $product = $this->productRepository->find($item->productId);
        return $product->price * $item->quantity;
    }
}

// Event Listener handles notifications
class SendOrderNotificationListener
{
    public function handle(OrderPlaced $event): void
    {
        Mail::to($event->order->customer)->send(
            new OrderConfirmationMail($event->order)
        );
    }
}
```

**Benefits**:
- Each UseCase has single responsibility
- Easy to test (fewer dependencies)
- Services are reusable across UseCases
- Side effects handled by Event Listeners
- Changes are isolated

---

## 3. Controller Business Logic

### Problem

Controllers that contain business logic instead of delegating to UseCases violate the layer separation and make the code difficult to test and maintain.

### ❌ Anti-Pattern: Controller with Business Logic

```php
class PostController extends Controller
{
    public function store(StorePostRequest $request): JsonResponse
    {
        // ❌ Business logic in Controller
        $existingReport = Post::where('user_id', auth()->id())
            ->where('week_start_date', $request->week_start_date)
            ->first();

        if ($existingReport) {
            return response()->json([
                'error' => 'A report for this week already exists.',
            ], 422);
        }

        // ❌ Direct Model usage in Controller
        $post = Post::create([
            'user_id' => auth()->id(),
            'week_start_date' => $request->week_start_date,
            'title' => $request->title,
            'status' => $request->status,
        ]);

        // ❌ More business logic
        foreach ($request->tag_values as $tagValue) {
            $post->tags()->attach($tagValue['tag_id'], [
                'value' => $tagValue['value'],
            ]);
        }

        return response()->json(['data' => new PostResource($post)], 201);
    }
}
```

**Problems**:
- Business logic scattered in Controller
- Direct Model access (no Repository)
- Difficult to test without HTTP request
- No separation of concerns
- Duplicate logic if same validation needed elsewhere

### ✅ Correct: Thin Controller + UseCase

```php
// Controller - Just orchestration
class PostController extends Controller
{
    public function __construct(
        private CreatePostUseCase $createPostUseCase,
    ) {}

    public function store(StorePostRequest $request): JsonResponse
    {
        // 1. Get DTO from FormRequest
        $data = $request->getCreatePostData();

        // 2. Call UseCase
        $post = $this->createPostUseCase->execute($data);

        // 3. Return response
        return response()->json([
            'data' => new PostResource($post),
        ], 201);
    }
}

// UseCase - Business logic
final readonly class CreatePostUseCase
{
    public function __construct(
        private PostRepositoryInterface $repository,
    ) {}

    public function execute(CreatePostData $data): Post
    {
        // Business rule: Duplicate check
        $existing = $this->repository->findByUserAndWeek(
            $data->userId,
            $data->weekStartDate,
        );

        if ($existing !== null) {
            throw ValidationException::withMessages([
                'week_start_date' => ['A report for this week already exists.'],
            ]);
        }

        // Create via Repository
        return $this->repository->create(
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

**Benefits**:
- Controller is thin and testable
- Business logic in UseCase
- Repository abstracts data access
- Easy to unit test UseCase with mocked Repository

---

## 4. Leaky Abstractions

### Problem

Leaky abstractions occur when implementation details (like Laravel-specific types) leak through Repository interfaces. This couples UseCase to infrastructure and makes testing difficult.

### ❌ Anti-Pattern: Repository Returns Framework Types

```php
// Repository interface leaking Laravel types
interface PostRepositoryInterface
{
    // ❌ Returns Laravel Collection
    public function findAll(): Collection;

    // ❌ Returns Laravel Paginator
    public function paginate(): LengthAwarePaginator;

    // ❌ Returns Eloquent Builder
    public function query(): Builder;
}

// UseCase coupled to Laravel
final readonly class GetPostsUseCase
{
    public function execute(): Collection  // ❌ Coupled to Laravel
    {
        return $this->repository->findAll();
    }
}
```

**Problems**:
- UseCase depends on Laravel-specific types
- Cannot test without Laravel
- Cannot swap implementation easily

### ✅ Correct: Repository Uses Standard Types

```php
// Repository interface with standard types
interface PostRepositoryInterface
{
    /** @return array<Post> */
    public function findAll(): array;

    public function findPaginated(int $page, int $perPage): PaginatedResult;

    public function findById(int $id): ?Post;
}

// PaginatedResult is a simple DTO
final readonly class PaginatedResult
{
    /**
     * @param array<Post> $items
     */
    public function __construct(
        public array $items,
        public int $total,
        public int $page,
        public int $perPage,
    ) {}

    public function hasNextPage(): bool
    {
        return $this->page * $this->perPage < $this->total;
    }
}

// Implementation converts Laravel types internally
class PostRepository implements PostRepositoryInterface
{
    public function findAll(): array
    {
        return Post::all()->all();  // Convert Collection to array
    }

    public function findPaginated(int $page, int $perPage): PaginatedResult
    {
        $paginator = Post::paginate($perPage, ['*'], 'page', $page);

        return new PaginatedResult(
            items: $paginator->items(),
            total: $paginator->total(),
            page: $paginator->currentPage(),
            perPage: $paginator->perPage(),
        );
    }
}
```

**Benefits**:
- UseCase is framework-agnostic
- Easy to test (use simple arrays)
- Can swap implementation easily
- Clean separation between layers

---

## 5. UseCase Returning Resource

### Problem

UseCases should return Eloquent Models, not API Resources. The transformation to JSON response should happen in the Controller layer.

### ❌ Anti-Pattern: UseCase Returns Resource

```php
// ❌ UseCase returns Resource
final readonly class CreatePostUseCase
{
    public function execute(CreatePostData $data): PostResource
    {
        $post = $this->repository->create(...);
        return new PostResource($post);  // Wrong layer!
    }
}

// Controller just passes through
class PostController extends Controller
{
    public function store(StorePostRequest $request): JsonResponse
    {
        $resource = $this->createPostUseCase->execute($data);
        return response()->json(['data' => $resource], 201);
    }
}
```

**Problems**:
- UseCase knows about presentation layer
- Can't reuse UseCase in non-API context
- Violates layer dependency rules

### ✅ Correct: UseCase Returns Model

```php
// UseCase returns Model
final readonly class CreatePostUseCase
{
    public function execute(CreatePostData $data): Post
    {
        return $this->repository->create(...);
    }
}

// Controller transforms to Resource
class PostController extends Controller
{
    public function store(StorePostRequest $request): JsonResponse
    {
        $data = $request->getCreatePostData();
        $post = $this->createPostUseCase->execute($data);

        return response()->json([
            'data' => new PostResource($post),  // Correct layer!
        ], 201);
    }
}
```

**Benefits**:
- UseCase is reusable in any context
- Clear separation: UseCase returns data, Controller formats response
- Follows layer dependency rules
