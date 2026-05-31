# Repository Pattern - Interface and Implementation Separation

## AI's Common Failure Patterns

### Pattern 1: No Interface Separation

**❌ AI writes: No interface separation**

```php
final class UserRepository
{
    public function findById(int $id): ?User
    {
        return User::find($id);
    }
}

// Problems:
// - No interface defined
// - Can't swap implementations
// - Hard to test (tightly coupled to Eloquent)
// - UseCase depends on concrete implementation
```

### Pattern 2: Business Logic in Repository

**❌ AI writes: Business logic in Repository**

```php
final class PostRepository implements PostRepositoryInterface
{
    public function create(CreatePostData $data): Post
    {
        // Business logic in Repository - WRONG!
        if ($data->status === PostStatus::Submitted) {
            $this->validateSubmission($data);
        }

        return Post::create([...]);
    }
}

// Problems:
// - Business logic should be in UseCase
// - Repository is only for data access
// - Violates Single Responsibility
```

---

## ✅ Correct Pattern: Interface in Repositories Directory

### Repository Interface

```php
// app/Repositories/User/UserRepositoryInterface.php

namespace App\Repositories\User;

use App\Models\User;

interface UserRepositoryInterface
{
    public function findById(int $id): ?User;
    public function findByEmail(string $email): ?User;
    public function findAll(): array;
    public function create(string $name, string $email, string $password): User;
    public function update(int $id, array $data): User;
    public function delete(int $id): bool;
}
```

### Repository Implementation

```php
// app/Repositories/User/UserRepository.php

namespace App\Repositories\User;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

final class UserRepository implements UserRepositoryInterface
{
    public function findById(int $id): ?User
    {
        return User::find($id);
    }

    public function findByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }

    public function findAll(): array
    {
        return User::all()->all();
    }

    public function create(string $name, string $email, string $password): User
    {
        return User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
        ]);
    }

    public function update(int $id, array $data): User
    {
        $user = User::findOrFail($id);
        $user->update($data);

        return $user->fresh();
    }

    public function delete(int $id): bool
    {
        return User::destroy($id) > 0;
    }
}
```

### Service Provider Binding

```php
// app/Providers/AppServiceProvider.php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\User\UserRepositoryInterface;
use App\Repositories\User\UserRepository;
use App\Repositories\Post\PostRepositoryInterface;
use App\Repositories\Post\PostRepository;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Repository bindings
        $this->app->bind(
            UserRepositoryInterface::class,
            UserRepository::class,
        );

        $this->app->bind(
            PostRepositoryInterface::class,
            PostRepository::class,
        );
    }
}
```

---

## Repository Method Patterns

### Find Single Model

```php
// By ID
public function findById(int $id): ?Post
{
    return Post::find($id);
}

// By unique property
public function findByUserAndWeek(int $userId, string $weekStartDate): ?Post
{
    return Post::where('user_id', $userId)
        ->where('week_start_date', $weekStartDate)
        ->first();
}
```

### Find Multiple Models

```php
// Find all
public function findAll(): array
{
    return Post::all()->all();
}

// Find with criteria
public function findByUser(int $userId): array
{
    return Post::where('user_id', $userId)
        ->orderBy('created_at', 'desc')
        ->get()
        ->all();
}

// Find by IDs
public function findByIds(array $ids): array
{
    return Post::whereIn('id', $ids)
        ->get()
        ->all();
}
```

### Create with Relations

```php
public function create(
    int $userId,
    string $weekStartDate,
    string $title,
    ?string $memo,
    PostStatus $status,
    array $tagValues
): Post {
    return DB::transaction(function () use (
        $userId, $weekStartDate, $title, $memo, $status, $tagValues
    ) {
        $post = Post::create([
            'user_id' => $userId,
            'week_start_date' => $weekStartDate,
            'title' => $title,
            'memo' => $memo,
            'status' => $status,
        ]);

        foreach ($tagValues as $tagValue) {
            $post->tags()->attach($tagValue['tag_id'], [
                'value' => $tagValue['value'],
            ]);
        }

        return $post->fresh(['tags']);
    });
}
```

### Update with Relations

```php
public function update(
    int $id,
    string $weekStartDate,
    string $title,
    ?string $memo,
    PostStatus $status,
    array $tagValues
): Post {
    return DB::transaction(function () use (
        $id, $weekStartDate, $title, $memo, $status, $tagValues
    ) {
        $post = Post::findOrFail($id);

        $post->update([
            'week_start_date' => $weekStartDate,
            'title' => $title,
            'memo' => $memo,
            'status' => $status,
        ]);

        // Sync tags
        $syncData = [];
        foreach ($tagValues as $tagValue) {
            $syncData[$tagValue['tag_id']] = ['value' => $tagValue['value']];
        }
        $post->tags()->sync($syncData);

        return $post->fresh(['tags']);
    });
}
```

### Delete

```php
public function delete(int $id): bool
{
    return Post::destroy($id) > 0;
}

// Soft delete
public function softDelete(int $id): bool
{
    $post = Post::find($id);
    if ($post === null) {
        return false;
    }

    return $post->delete();
}
```

### Exists Check

```php
public function exists(int $id): bool
{
    return Post::where('id', $id)->exists();
}

public function existsByUserAndWeek(int $userId, string $weekStartDate): bool
{
    return Post::where('user_id', $userId)
        ->where('week_start_date', $weekStartDate)
        ->exists();
}
```

---

## Query Optimization

### Eager Loading

```php
public function findWithRelations(int $id): ?Post
{
    return Post::with(['user', 'tags'])->find($id);
}

public function findAllWithRelations(): array
{
    return Post::with(['user', 'tags'])
        ->orderBy('created_at', 'desc')
        ->get()
        ->all();
}
```

### Pagination Support

```php
use Illuminate\Pagination\LengthAwarePaginator;

public function search(
    ?int $userId,
    ?string $query,
    ?PostStatus $status,
    int $page = 1,
    int $perPage = 20
): LengthAwarePaginator {
    $builder = Post::with(['user', 'tags']);

    if ($userId !== null) {
        $builder->where('user_id', $userId);
    }

    if ($query !== null) {
        $builder->where('title', 'like', "%{$query}%");
    }

    if ($status !== null) {
        $builder->where('status', $status);
    }

    return $builder->orderBy('created_at', 'desc')
        ->paginate($perPage, ['*'], 'page', $page);
}
```

### Filtering and Sorting

```php
// Using Laravel Data DTO for criteria
use App\Data\Post\SearchPostsData;

public function search(SearchPostsData $criteria): LengthAwarePaginator
{
    $query = Post::with(['user', 'tags']);

    if ($criteria->userId !== null) {
        $query->where('user_id', $criteria->userId);
    }

    if ($criteria->q !== null) {
        $query->where('title', 'like', "%{$criteria->q}%");
    }

    if ($criteria->status !== null) {
        $query->where('status', $criteria->status);
    }

    if ($criteria->weekStartDate !== null) {
        $query->where('week_start_date', $criteria->weekStartDate);
    }

    return $query->orderBy('created_at', 'desc')
        ->paginate($criteria->perPage, ['*'], 'page', $criteria->page);
}
```

---

## Transaction Handling

### Simple Operations: Repository Manages Transaction

```php
// ✅ Correct: Repository manages transaction for related operations
public function create(
    int $userId,
    string $title,
    array $tagValues
): Post {
    return DB::transaction(function () use ($userId, $title, $tagValues) {
        $post = Post::create([
            'user_id' => $userId,
            'title' => $title,
        ]);

        foreach ($tagValues as $tagValue) {
            $post->tags()->attach($tagValue['tag_id'], [
                'value' => $tagValue['value'],
            ]);
        }

        return $post->fresh(['tags']);
    });
}
```

### Complex Operations: UseCase Manages Transaction

```php
// ✅ Correct: UseCase manages transaction for multiple repositories
final readonly class TransferOwnershipUseCase
{
    public function __construct(
        private PostRepositoryInterface $postRepository,
        private UserRepositoryInterface $userRepository,
    ) {}

    public function execute(int $postId, int $newOwnerId): Post
    {
        return DB::transaction(function () use ($postId, $newOwnerId) {
            // Validate new owner exists
            $newOwner = $this->userRepository->findById($newOwnerId);
            if ($newOwner === null) {
                throw ValidationException::withMessages([
                    'new_owner_id' => ['User not found.'],
                ]);
            }

            // Update ownership
            return $this->postRepository->updateOwner($postId, $newOwnerId);
        });
    }
}
```

---

## Directory Structure

```
app/
├── Repositories/
│   ├── User/
│   │   ├── UserRepositoryInterface.php
│   │   └── UserRepository.php
│   ├── Post/
│   │   ├── PostRepositoryInterface.php
│   │   └── PostRepository.php
│   └── Tag/
│       ├── TagRepositoryInterface.php
│       └── TagRepository.php
├── UseCases/
│   └── Post/
│       ├── CreatePostUseCase.php     # Uses PostRepositoryInterface
│       └── GetPostsUseCase.php
├── Models/
│   ├── User.php
│   ├── Post.php
│   └── Tag.php
└── Providers/
    └── AppServiceProvider.php         # Binds interfaces
```

---

## Testing Repositories

### Interface Mocking in UseCase Tests

```php
final class CreatePostUseCaseTest extends TestCase
{
    public function test_can_create_post(): void
    {
        // Arrange
        $repository = $this->createMock(PostRepositoryInterface::class);
        $repository->expects($this->once())
            ->method('findByUserAndWeek')
            ->with(1, '2025-01-01')
            ->willReturn(null);

        $repository->expects($this->once())
            ->method('create')
            ->willReturn(new Post(['id' => 1, 'title' => 'Test Post']));

        $useCase = new CreatePostUseCase($repository);

        // Act
        $data = new CreatePostData(
            userId: 1,
            weekStartDate: '2025-01-01',
            title: 'Test Post',
            memo: null,
            status: PostStatus::Draft,
            tagValues: [],
        );
        $result = $useCase->execute($data);

        // Assert
        $this->assertInstanceOf(Post::class, $result);
        $this->assertEquals('Test Post', $result->title);
    }
}
```

### Repository Implementation Tests (Feature Tests)

```php
final class PostRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private PostRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(PostRepositoryInterface::class);
    }

    public function test_can_find_by_id(): void
    {
        // Arrange
        $post = Post::factory()->create();

        // Act
        $found = $this->repository->findById($post->id);

        // Assert
        $this->assertNotNull($found);
        $this->assertEquals($post->id, $found->id);
    }

    public function test_returns_null_for_non_existent_id(): void
    {
        // Act
        $found = $this->repository->findById(99999);

        // Assert
        $this->assertNull($found);
    }

    public function test_can_create_post_with_tags(): void
    {
        // Arrange
        $user = User::factory()->create();
        $tag = Tag::factory()->create();

        // Act
        $post = $this->repository->create(
            userId: $user->id,
            weekStartDate: '2025-01-01',
            title: 'Test Post',
            memo: 'Test memo',
            status: PostStatus::Draft,
            tagValues: [
                ['tag_id' => $tag->id, 'value' => '100'],
            ]
        );

        // Assert
        $this->assertInstanceOf(Post::class, $post);
        $this->assertEquals('Test Post', $post->title);
        $this->assertCount(1, $post->tags);
    }
}
```

---

## Checklist: Repository Pattern

Before considering a Repository implementation complete, verify:

- [ ] Interface defined in `app/Repositories/[Resource]/`
- [ ] Implementation in same directory
- [ ] Named `[Resource]RepositoryInterface` and `[Resource]Repository`
- [ ] Returns Eloquent Model (not custom Entity)
- [ ] Uses scalar types for method parameters (not ValueObjects)
- [ ] Service Provider binds interface to implementation
- [ ] No business logic in Repository (only data access)
- [ ] Transaction management for related operations
- [ ] Eager loading for relations (`with()`)

---

## Why This Matters

**Without Interface/Implementation separation**:
- Tight coupling to Eloquent in UseCase
- Can't swap implementations for testing
- Hard to mock in unit tests
- Violates Dependency Inversion Principle

**With proper Repository pattern**:
- Dependency Inversion (UseCase depends on interface)
- Testability (easy to mock interface)
- Flexibility (can swap implementations)
- Clear separation between business logic and data access
- Type safety with Laravel Data DTOs
