# Cross-Domain Communication - Service Layer Patterns

## AI's Common Failure Pattern

**❌ AI writes: UseCase directly uses another domain's Repository**

```php
// In Post UseCase
use App\Repositories\User\UserRepositoryInterface;

final class CreatePostUseCase
{
    public function __construct(
        private PostRepositoryInterface $postRepository,
        private UserRepositoryInterface $userRepository, // Wrong!
    ) {}

    public function execute(CreatePostData $data): Post
    {
        // Directly accessing User domain's Repository
        $user = $this->userRepository->findById($data->userId);

        if ($user === null) {
            throw new ValidationException::withMessages([
                'user_id' => ['User not found.'],
            ]);
        }

        // ...
    }
}
```

**Problems**:
- Domain coupling (Post depends on User internals)
- UseCase layer knows about other domain's Repository
- Creates dependency web
- Hard to test (need multiple Repository mocks)

---

## ✅ Correct Pattern: Use Service Layer for Cross-Domain Communication

### Step 1: Define Service Interface

```php
// app/Services/User/UserServiceInterface.php

namespace App\Services\User;

interface UserServiceInterface
{
    public function findById(int $id): ?UserDto;
    public function exists(int $id): bool;
    public function findByEmail(string $email): ?UserDto;
}
```

### Step 2: Define Service DTO

```php
// app/Services/User/UserDto.php

namespace App\Services\User;

final class UserDto
{
    public function __construct(
        public int $id,
        public string $name,
        public string $email,
        public string $status,
    ) {}

    public static function fromModel(\App\Models\User $user): self
    {
        return new self(
            id: $user->id,
            name: $user->name,
            email: $user->email,
            status: $user->status->value,
        );
    }
}
```

### Step 3: Implement Service

```php
// app/Services/User/UserService.php

namespace App\Services\User;

use App\Models\User;

final class UserService implements UserServiceInterface
{
    public function findById(int $id): ?UserDto
    {
        $user = User::find($id);

        if ($user === null) {
            return null;
        }

        return UserDto::fromModel($user);
    }

    public function exists(int $id): bool
    {
        return User::where('id', $id)->exists();
    }

    public function findByEmail(string $email): ?UserDto
    {
        $user = User::where('email', $email)->first();

        if ($user === null) {
            return null;
        }

        return UserDto::fromModel($user);
    }
}
```

### Step 4: Register Service Provider Binding

```php
// app/Providers/AppServiceProvider.php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\User\UserServiceInterface;
use App\Services\User\UserService;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Service binding
        $this->app->bind(
            UserServiceInterface::class,
            UserService::class,
        );
    }
}
```

### Step 5: Use Service in UseCase

```php
// app/UseCases/Post/CreatePostUseCase.php

namespace App\UseCases\Post;

use App\Services\User\UserServiceInterface;
use App\Repositories\Post\PostRepositoryInterface;

final class CreatePostUseCase
{
    public function __construct(
        private PostRepositoryInterface $postRepository,
        private UserServiceInterface $userService, // Via Service
    ) {}

    public function execute(CreatePostData $data): Post
    {
        // Validate user exists (via Service)
        if (!$this->userService->exists($data->userId)) {
            throw ValidationException::withMessages([
                'user_id' => ['User not found.'],
            ]);
        }

        return $this->postRepository->create(
            $data->userId,
            $data->weekStartDate,
            $data->title,
            $data->memo,
            $data->status,
            $data->tagValues
        );
    }
}
```

---

## Service Design Patterns

### Pattern 1: Simple Existence Check

```php
// Service Interface
interface UserServiceInterface
{
    public function exists(int $id): bool;
}

// Implementation
final class UserService implements UserServiceInterface
{
    public function exists(int $id): bool
    {
        return User::where('id', $id)->exists();
    }
}

// Usage in UseCase
if (!$this->userService->exists($data->userId)) {
    throw ValidationException::withMessages([
        'user_id' => ['User not found.'],
    ]);
}
```

### Pattern 2: Retrieve Basic Data

```php
// Service DTO
final class UserDto
{
    public function __construct(
        public int $id,
        public string $name,
        public string $email,
    ) {}

    public static function fromModel(User $user): self
    {
        return new self(
            id: $user->id,
            name: $user->name,
            email: $user->email,
        );
    }
}

// Service Interface
interface UserServiceInterface
{
    public function findById(int $id): ?UserDto;
}

// Implementation
final class UserService implements UserServiceInterface
{
    public function findById(int $id): ?UserDto
    {
        $user = User::find($id);

        if ($user === null) {
            return null;
        }

        return UserDto::fromModel($user);
    }
}

// Usage
$userDto = $this->userService->findById($data->userId);
if ($userDto === null) {
    throw ValidationException::withMessages([
        'user_id' => ['User not found.'],
    ]);
}
```

### Pattern 3: Batch Operations

```php
// Service Interface
interface UserServiceInterface
{
    /**
     * @param array<int> $ids
     * @return array<UserDto>
     */
    public function findByIds(array $ids): array;

    /**
     * @param array<int> $ids
     */
    public function allExist(array $ids): bool;
}

// Implementation
final class UserService implements UserServiceInterface
{
    public function findByIds(array $ids): array
    {
        return User::whereIn('id', $ids)
            ->get()
            ->map(fn ($user) => UserDto::fromModel($user))
            ->all();
    }

    public function allExist(array $ids): bool
    {
        return User::whereIn('id', $ids)->count() === count($ids);
    }
}

// Usage
if (!$this->userService->allExist($data->memberIds)) {
    throw ValidationException::withMessages([
        'member_ids' => ['Some users do not exist.'],
    ]);
}
```

### Pattern 4: Query with Criteria

```php
// Service DTO for criteria
final class UserSearchCriteria
{
    public function __construct(
        public ?string $nameKeyword = null,
        public ?string $status = null,
        public int $page = 1,
        public int $perPage = 20,
    ) {}
}

// Service Interface
interface UserServiceInterface
{
    /**
     * @return array<UserDto>
     */
    public function search(UserSearchCriteria $criteria): array;
}

// Implementation
final class UserService implements UserServiceInterface
{
    public function search(UserSearchCriteria $criteria): array
    {
        $query = User::query();

        if ($criteria->nameKeyword !== null) {
            $query->where('name', 'like', "%{$criteria->nameKeyword}%");
        }

        if ($criteria->status !== null) {
            $query->where('status', $criteria->status);
        }

        return $query
            ->orderBy('created_at', 'desc')
            ->skip(($criteria->page - 1) * $criteria->perPage)
            ->take($criteria->perPage)
            ->get()
            ->map(fn ($user) => UserDto::fromModel($user))
            ->all();
    }
}
```

### Pattern 5: Business Operations

```php
// Service Interface
interface UserServiceInterface
{
    public function activate(int $id): void;
    public function deactivate(int $id): void;
}

// Implementation
final class UserService implements UserServiceInterface
{
    public function activate(int $id): void
    {
        $user = User::findOrFail($id);
        $user->update(['status' => UserStatus::Active]);
    }

    public function deactivate(int $id): void
    {
        $user = User::findOrFail($id);
        $user->update(['status' => UserStatus::Inactive]);
    }
}
```

---

## Directory Structure

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Api/
│   │   │   ├── PostController.php
│   │   │   └── UserController.php
│   │   └── Web/
│   │       ├── PostPageController.php
│   │       └── UserPageController.php
│   ├── Requests/
│   └── Resources/
│
├── UseCases/                           # Business Logic Layer
│   ├── Post/
│   │   ├── CreatePostUseCase.php       # Uses UserServiceInterface
│   │   ├── UpdatePostUseCase.php
│   │   └── GetPostsUseCase.php
│   └── User/
│       ├── CreateUserUseCase.php
│       └── GetUsersUseCase.php
│
├── Services/                           # Shared Logic Layer
│   ├── Post/
│   │   ├── PostExportService.php       # Complex operations
│   │   └── PostStatisticsService.php
│   └── User/
│       ├── UserServiceInterface.php    # Interface for cross-domain
│       ├── UserService.php             # Implementation
│       └── UserDto.php                 # Service-specific DTO
│
├── Repositories/                       # Data Access Layer
│   ├── Post/
│   │   ├── PostRepositoryInterface.php
│   │   └── PostRepository.php
│   └── User/
│       ├── UserRepositoryInterface.php
│       └── UserRepository.php
│
├── Models/                             # Model Layer
│   ├── Post.php
│   └── User.php
│
└── Providers/
    └── AppServiceProvider.php          # Binds interfaces
```

---

## Layer Dependency Rules

### Allowed Dependencies

```php
// ✅ UseCase can depend on Service Interface
use App\Services\User\UserServiceInterface;

// ✅ UseCase can depend on Repository Interface
use App\Repositories\Post\PostRepositoryInterface;

// ✅ Service can depend on Model
use App\Models\User;

// ✅ Service can depend on Repository Interface
use App\Repositories\User\UserRepositoryInterface;
```

### Forbidden Dependencies

```php
// ❌ UseCase cannot depend on another domain's Repository directly
use App\Repositories\User\UserRepositoryInterface; // In PostUseCase

// ❌ Controller cannot depend on Repository directly
use App\Repositories\Post\PostRepositoryInterface;

// ❌ Service cannot depend on UseCase
use App\UseCases\User\CreateUserUseCase;
```

---

## Static Analysis with Deptrac

### Layer Dependency Configuration

```yaml
# deptrac.yaml
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
      - Model
    Service:
      - Repository
      - Model
    Repository:
      - Model
    Resource:
      - Model
    Model: []
```

### Running Deptrac

```bash
./vendor/bin/deptrac analyse
```

---

## Service Design Guidelines

### 1. Keep Service DTOs Simple
- Use primitives (int, string, bool, array)
- No business logic in DTOs
- Immutable (readonly)
- Use `fromModel()` factory method

### 2. Define Minimal Interface
- Only expose what other UseCases need
- Don't expose internal implementation details
- Follow Interface Segregation Principle

### 3. Use Primitives for Parameters
- Accept primitives, not domain-specific types
- Service is boundary between domains
- Keep interface simple and clear

### 4. Return DTOs, Not Models
- Never return Eloquent Models directly
- Create Service-specific DTOs
- Control data exposure

### 5. Service vs Repository
- **Repository**: Data access abstraction (CRUD)
- **Service**: Business logic that spans domains or requires complex operations

---

## Testing with Services

### Mock Service in Tests

```php
final class CreatePostUseCaseTest extends TestCase
{
    public function test_can_create_post(): void
    {
        // Mock UserService
        $userService = $this->createMock(UserServiceInterface::class);
        $userService->expects($this->once())
            ->method('exists')
            ->with(1)
            ->willReturn(true);

        // Mock PostRepository
        $postRepository = $this->createMock(PostRepositoryInterface::class);
        $postRepository->expects($this->once())
            ->method('create')
            ->willReturn(new Post(['id' => 1]));

        $useCase = new CreatePostUseCase(
            postRepository: $postRepository,
            userService: $userService,
        );

        $data = new CreatePostData(
            userId: 1,
            weekStartDate: '2025-01-01',
            title: 'Test Post',
            memo: null,
            status: PostStatus::Draft,
            tagValues: [],
        );

        $result = $useCase->execute($data);

        $this->assertInstanceOf(Post::class, $result);
    }

    public function test_throws_exception_when_user_not_found(): void
    {
        $userService = $this->createMock(UserServiceInterface::class);
        $userService->expects($this->once())
            ->method('exists')
            ->with(999)
            ->willReturn(false);

        $postRepository = $this->createMock(PostRepositoryInterface::class);

        $useCase = new CreatePostUseCase(
            postRepository: $postRepository,
            userService: $userService,
        );

        $data = new CreatePostData(
            userId: 999,
            weekStartDate: '2025-01-01',
            title: 'Test Post',
            memo: null,
            status: PostStatus::Draft,
            tagValues: [],
        );

        $this->expectException(ValidationException::class);
        $useCase->execute($data);
    }
}
```

---

## Checklist: Cross-Domain Communication

Before considering cross-domain communication correct, verify:

- [ ] Service interface defined in `app/Services/`
- [ ] Service DTOs use primitives only
- [ ] Service implements interface
- [ ] Service Provider binds interface to implementation
- [ ] UseCase uses Service interface (not Repository of other domain)
- [ ] No direct cross-domain Repository references in UseCase
- [ ] Deptrac validates layer dependencies
- [ ] Tests mock Service interfaces

---

## Why This Matters

**Without Service layer pattern**:
- Tight domain coupling
- UseCase knows about other domain's Repository
- Dependency web between UseCases
- Hard to understand domain boundaries
- Difficult to test in isolation

**With Service layer pattern**:
- Loose coupling between domains
- Clear domain boundaries
- Independent domain evolution
- Easy to test (mock Service)
- Maintainable architecture
- Single responsibility for each layer
