# Layer Separation - Preventing Cross-Layer Dependencies

## AI's Common Failure Patterns

### Pattern 1: Controller Contains Business Logic

**❌ AI writes: Business logic in controller**

```php
// In Controller
class PostController extends Controller
{
    public function store(Request $request)
    {
        // Business logic in controller - WRONG!
        $existingPost = Post::where('user_id', auth()->id())
            ->where('week_start_date', $request->input('week_start_date'))
            ->first();

        if ($existingPost) {
            return back()->withErrors(['week_start_date' => 'Already exists']);
        }

        $post = Post::create([
            'user_id' => auth()->id(),
            'title' => $request->input('title'),
            // ...
        ]);

        return redirect()->route('posts.index');
    }
}
```

**Problems**:
- Business logic mixed with HTTP handling
- Hard to test (requires HTTP request)
- Can't reuse logic (CLI, API, etc.)
- Violates Single Responsibility Principle

### Pattern 2: UseCase Uses Eloquent Directly

**❌ AI writes: UseCase uses Eloquent directly**

```php
final class CreatePostUseCase
{
    public function execute(CreatePostData $data): Post
    {
        // Direct Eloquent usage - acceptable in simple cases
        // but bypasses Repository abstraction
        return Post::create([
            'user_id' => $data->userId,
            'title' => $data->title,
        ]);
    }
}
```

**Problems**:
- Application layer depends directly on Eloquent
- Bypasses Repository abstraction (when needed)
- Hard to test without database
- Can't swap storage implementation

### Pattern 3: Model Contains Business Logic

**❌ AI writes: Business logic in Model**

```php
class Post extends Model
{
    public function submit(): void
    {
        // Business logic in Model - WRONG!
        if ($this->status === PostStatus::Submitted) {
            throw new \Exception('Already submitted');
        }
        $this->status = PostStatus::Submitted;
        $this->save();
    }
}
```

**Problems**:
- Business logic mixed with data structure
- Difficult to test without database
- Model becomes bloated
- Violates Single Responsibility Principle

---

## ✅ Correct Pattern: Proper Layer Isolation

### 7-Layer Architecture Dependency Rules

```
Presentation (Controllers) → Request → UseCase → Service/Repository → Model → Resource
```

**Rules**:
1. Controllers handle HTTP only, delegate to UseCases
2. UseCases contain business logic
3. Repositories abstract data access
4. Models are data containers only
5. Resources transform data for responses

### Controller: HTTP Handling Only

```php
// ✅ Correct: Controller delegates to UseCase
// app/Http/Controllers/Api/PostController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostRequest;
use App\Http\Resources\PostResource;
use App\UseCases\Post\CreatePostUseCase;
use Illuminate\Http\JsonResponse;

class PostController extends Controller
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

### UseCase: Business Logic

```php
// ✅ Correct: UseCase contains business logic
// app/UseCases/Post/CreatePostUseCase.php

namespace App\UseCases\Post;

use App\Data\Post\CreatePostData;
use App\Models\Post;
use App\Repositories\Post\PostRepositoryInterface;
use Illuminate\Validation\ValidationException;

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

        // Create via Repository
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

### Repository: Data Access Abstraction

```php
// ✅ Correct: Repository interface in app/Repositories/
// app/Repositories/Post/PostRepositoryInterface.php

namespace App\Repositories\Post;

use App\Enums\PostStatus;
use App\Models\Post;

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
    public function update(int $id, array $data): Post;
    public function delete(int $id): bool;
}

// app/Repositories/Post/PostRepository.php

namespace App\Repositories\Post;

use App\Enums\PostStatus;
use App\Models\Post;
use Illuminate\Support\Facades\DB;

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

    // Other methods...
}
```

### Model: Data Container Only

```php
// ✅ Correct: Model is data container
// app/Models/Post.php

namespace App\Models;

use App\Enums\PostStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
class Post extends Model
{
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

    // Query scopes (NOT business logic)
    public function scopeByStatus(Builder $query, PostStatus $status): Builder
    {
        return $query->where('status', $status);
    }
}
```

---

## Detecting Layer Violations

### Controller Layer Violations

**❌ Forbidden in Controllers:**

```php
// Business logic
if ($post->status === PostStatus::Submitted) {
    throw new \Exception('Cannot edit submitted post');
}

// Direct database queries
$posts = Post::where('status', 'active')
    ->where('user_id', $userId)
    ->get();

// Complex data processing
$statistics = $posts->groupBy('status')
    ->map(fn ($group) => $group->count());
```

**✅ Allowed in Controllers:**

```php
// HTTP handling
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

// Form Requests
use App\Http\Requests\StorePostRequest;

// UseCase calls
$this->createPostUseCase->execute($data);

// Policy checks
$this->authorize('update', $post);

// Resource transformation
return response()->json(new PostResource($post));
```

### UseCase Layer Violations

**❌ Forbidden in UseCases:**

```php
// HTTP-specific logic
use Illuminate\Http\Request;
return response()->json([...]);

// Direct controller return types
return redirect()->route('posts.index');

// View rendering
return view('posts.index');
```

**✅ Allowed in UseCases:**

```php
// Repository interfaces
use App\Repositories\Post\PostRepositoryInterface;

// Laravel Data DTOs
use App\Data\Post\CreatePostData;

// Eloquent Models as return types
use App\Models\Post;

// Validation exceptions
use Illuminate\Validation\ValidationException;

// Transaction management
use Illuminate\Support\Facades\DB;
```

### Model Layer Violations

**❌ Forbidden in Models:**

```php
// Business logic
public function submit(): void { ... }
public function canBeEdited(): bool { ... }

// Authorization logic
public function canBeEditedBy(User $user): bool { ... }

// Validation logic
public function validate(): bool { ... }
```

**✅ Allowed in Models:**

```php
// Relationships
public function user(): BelongsTo { ... }

// Casts
protected function casts(): array { ... }

// Query scopes
public function scopeByStatus($query, $status) { ... }

// Accessors/Mutators
protected function formattedDate(): Attribute { ... }
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

## Checklist: Layer Separation

Before considering layer separation correct, verify:

### Controller Layer
- [ ] No business logic
- [ ] Only HTTP handling
- [ ] Uses UseCases for all operations
- [ ] Uses Policy for authorization
- [ ] Returns Resources for JSON responses

### UseCase Layer
- [ ] Contains business logic
- [ ] Uses Repository interfaces
- [ ] No HTTP-specific logic
- [ ] Returns Models or DTOs
- [ ] Handles transactions when needed

### Repository Layer
- [ ] Implements interface
- [ ] Only data access operations
- [ ] No business logic
- [ ] Returns Eloquent Models

### Model Layer
- [ ] Data container only
- [ ] Relationships defined
- [ ] Casts defined
- [ ] Query scopes (no business logic)
- [ ] No authorization logic

---

## Why This Matters

**Without layer separation**:
- Business logic scattered across controllers and models
- Hard to test
- Hard to reuse logic
- Tight coupling
- Difficult to maintain

**With proper layer separation**:
- Clear responsibilities
- Easy to test (mock repositories)
- Reusable business logic
- Loose coupling
- Maintainable and scalable
