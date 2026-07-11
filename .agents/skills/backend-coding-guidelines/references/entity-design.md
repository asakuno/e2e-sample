# Model Design - Eloquent Patterns

## AI's Most Critical Failure Pattern

**Pattern AI ALWAYS gets wrong**: Putting business logic in Models instead of UseCases

### ❌ Typical AI Pattern (Fat Model with Business Logic)

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

    public function canBeEditedBy(User $user): bool
    {
        // Authorization logic in Model - WRONG!
        return $this->user_id === $user->id;
    }
}
```

**Problems with this approach**:
1. Business logic mixed with data access
2. Difficult to test without database
3. Violates Single Responsibility Principle
4. Authorization should be in Policy
5. Business rules should be in UseCase

---

## ✅ Correct Pattern: Thin Model + UseCase

### Complete Model Implementation

```php
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

    // Query Scopes (NOT business logic)
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

### Business Logic in UseCase

```php
final class SubmitPostUseCase
{
    public function __construct(
        private PostRepositoryInterface $postRepository,
    ) {}

    public function execute(int $postId, int $userId): Post
    {
        $post = $this->postRepository->findById($postId);

        if ($post === null) {
            throw new PostNotFoundException($postId);
        }

        // Business rule: Already submitted check
        if ($post->status === PostStatus::Submitted) {
            throw ValidationException::withMessages([
                'status' => ['This post has already been submitted.'],
            ]);
        }

        // Business rule: Ownership check
        if ($post->user_id !== $userId) {
            throw new UnauthorizedAccessException('You cannot submit this post.');
        }

        return $this->postRepository->updateStatus($postId, PostStatus::Submitted);
    }
}
```

---

## Key Design Principles

### 1. Model Responsibilities (ONLY these)

- **Define table structure** (`$fillable`, `$casts`)
- **Define relationships** (`belongsTo`, `hasMany`, etc.)
- **Define query scopes** (reusable query constraints)
- **Define accessors/mutators** (data transformation)

### 2. NOT Model Responsibilities (put elsewhere)

| Responsibility | Where to Put |
|---------------|--------------|
| Business logic | UseCase |
| Authorization | Policy |
| Validation | FormRequest |
| Data access abstraction | Repository |
| Response transformation | Resource |

### 3. Readonly Properties via Casts

Use Eloquent casts for type safety:

```php
protected function casts(): array
{
    return [
        'week_start_date' => 'date',        // Carbon instance
        'status' => PostStatus::class,       // Enum
        'is_active' => 'boolean',            // Boolean
        'metadata' => 'array',               // Array
    ];
}
```

### 4. TypeScript Generation

Add `#[TypeScript()]` attribute for automatic type generation:

```php
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
class Post extends Model
{
    // ...
}
```

---

## Common Model Patterns

### Model with Enum Status

```php
#[TypeScript()]
class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => PostStatus::class,
        ];
    }

    // Scope for filtering by status
    public function scopeByStatus(Builder $query, PostStatus $status): Builder
    {
        return $query->where('status', $status);
    }

    // Scope for filtering submitted posts
    public function scopeSubmitted(Builder $query): Builder
    {
        return $query->where('status', PostStatus::Submitted);
    }

    // Scope for filtering draft posts
    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', PostStatus::Draft);
    }
}
```

### Model with Pivot Table

```php
#[TypeScript()]
class Post extends Model
{
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'post_tag')
            ->withPivot('value')
            ->withTimestamps();
    }

    public function sharedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'post_shares')
            ->withTimestamps();
    }
}
```

### Model with Accessor

```php
#[TypeScript()]
class Post extends Model
{
    // Accessor for formatted week start
    protected function formattedWeekStart(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->week_start_date->format('Y年n月j日週'),
        );
    }

    // Accessor for status label
    protected function statusLabel(): Attribute
    {
        return Attribute::make(
            get: fn () => $this->status->label(),
        );
    }
}
```

---

## Checklist: Model Design

Before considering a Model implementation complete, verify:

- [ ] Only data structure concerns (no business logic)
- [ ] `$fillable` explicitly defined
- [ ] `casts()` method for type conversions
- [ ] Relationships properly defined with return types
- [ ] Query scopes are pure query constraints
- [ ] No authorization logic (use Policy)
- [ ] No validation logic (use FormRequest)
- [ ] No data transformation for API (use Resource)
- [ ] `#[TypeScript()]` attribute for type generation
- [ ] Factory defined for testing

---

## Why This Matters

**With fat models**, code suffers from:
- Mixed responsibilities
- Difficult testing
- Tight coupling
- Hidden business rules
- Scattered authorization

**With thin models + UseCase**, you get:
- Clear separation of concerns
- Easy unit testing
- Loose coupling
- Explicit business rules
- Centralized authorization (Policy)
- TypeScript type generation
