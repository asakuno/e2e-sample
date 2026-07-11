# Model Layer Testing - Eloquent Models

This reference covers testing patterns for Model layer components (Eloquent Models) in the 7-layer architecture.

## Core Principles

- **Unit Tests for Casts/Scopes**: Test model logic in isolation
- **Feature Tests for Relationships**: Test with database for relationship verification
- **Factory Usage**: Use model factories for test data generation
- **No Business Logic in Models**: Models should be data containers, not business logic holders

---

## 1. Model Unit Testing

**Pattern AI gets wrong**: Putting business logic in Models and testing it there

```php
// ❌ AI writes: Business logic in Model
final class PostTest extends TestCase
{
    public function test_週報を提出できる(): void
    {
        $post = Post::factory()->create();
        $post->submit();  // Wrong! Business logic should be in UseCase

        $this->assertEquals(PostStatus::Submitted, $post->status);
    }
}
```

**Correct pattern**: Test only Model-specific logic (casts, scopes, accessors)

```php
// ✅ Correct: Test Model casts and scopes
final class PostTest extends TestCase
{
    use RefreshDatabase;

    public function test_ステータスがEnumにキャストされる(): void
    {
        // Arrange
        $post = Post::factory()->create(['status' => 'draft']);

        // Act
        $freshPost = Post::find($post->id);

        // Assert
        $this->assertInstanceOf(PostStatus::class, $freshPost->status);
        $this->assertEquals(PostStatus::Draft, $freshPost->status);
    }

    public function test_week_start_dateがCarbonにキャストされる(): void
    {
        // Arrange
        $post = Post::factory()->create(['week_start_date' => '2025-01-13']);

        // Act
        $freshPost = Post::find($post->id);

        // Assert
        $this->assertInstanceOf(Carbon::class, $freshPost->week_start_date);
        $this->assertEquals('2025-01-13', $freshPost->week_start_date->format('Y-m-d'));
    }
}
```

---

## 2. Scope Testing

**Pattern AI gets wrong**: Not testing scope with actual database queries

```php
// ❌ AI writes: No database verification
final class PostTest extends TestCase
{
    public function test_ステータスでフィルタできる(): void
    {
        $query = Post::query()->byStatus(PostStatus::Submitted);
        $this->assertStringContainsString('status', $query->toSql());  // Only checks SQL
    }
}
```

**Correct pattern**: Test scopes with actual data

```php
// ✅ Correct: Scope test with database
final class PostTest extends TestCase
{
    use RefreshDatabase;

    public function test_scopeByStatusでフィルタできる(): void
    {
        // Arrange
        Post::factory()->create(['status' => PostStatus::Draft]);
        Post::factory()->create(['status' => PostStatus::Submitted]);
        Post::factory()->create(['status' => PostStatus::Submitted]);

        // Act
        $submittedPosts = Post::byStatus(PostStatus::Submitted)->get();

        // Assert
        $this->assertCount(2, $submittedPosts);
        $this->assertTrue($submittedPosts->every(fn ($p) => $p->status === PostStatus::Submitted));
    }

    public function test_scopeByUserでフィルタできる(): void
    {
        // Arrange
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        Post::factory()->count(3)->create(['user_id' => $user->id]);
        Post::factory()->count(2)->create(['user_id' => $otherUser->id]);

        // Act
        $userPosts = Post::byUser($user->id)->get();

        // Assert
        $this->assertCount(3, $userPosts);
        $this->assertTrue($userPosts->every(fn ($p) => $p->user_id === $user->id));
    }
}
```

---

## 3. Relationship Testing

**Pattern AI gets wrong**: Not verifying relationship data

```php
// ❌ AI writes: Only checks relationship exists
final class PostTest extends TestCase
{
    use RefreshDatabase;

    public function test_ユーザーとの関連がある(): void
    {
        $post = Post::factory()->create();
        $this->assertNotNull($post->user);  // Not enough verification
    }
}
```

**Correct pattern**: Verify relationship data

```php
// ✅ Correct: Complete relationship test
final class PostTest extends TestCase
{
    use RefreshDatabase;

    public function test_userリレーションでユーザーを取得できる(): void
    {
        // Arrange
        $user = User::factory()->create(['name' => 'Test User']);
        $post = Post::factory()->create(['user_id' => $user->id]);

        // Act
        $freshPost = Post::with('user')->find($post->id);

        // Assert
        $this->assertInstanceOf(User::class, $freshPost->user);
        $this->assertEquals($user->id, $freshPost->user->id);
        $this->assertEquals('Test User', $freshPost->user->name);
    }

    public function test_tagsリレーションでタグ一覧を取得できる(): void
    {
        // Arrange
        $post = Post::factory()->create();
        $tags = Tag::factory()->count(3)->create();
        $post->tags()->attach($tags->pluck('id')->toArray(), ['value' => '100']);

        // Act
        $freshPost = Post::with('tags')->find($post->id);

        // Assert
        $this->assertCount(3, $freshPost->tags);
        $this->assertEquals('100', $freshPost->tags->first()->pivot->value);
    }

    public function test_sharedUsersリレーションで共有ユーザーを取得できる(): void
    {
        // Arrange
        $post = Post::factory()->create();
        $sharedUsers = User::factory()->count(2)->create();
        $post->sharedUsers()->attach($sharedUsers->pluck('id')->toArray());

        // Act
        $freshPost = Post::with('sharedUsers')->find($post->id);

        // Assert
        $this->assertCount(2, $freshPost->sharedUsers);
    }
}
```

---

## 4. Accessor/Mutator Testing

```php
// ✅ Correct: Accessor test
final class PostTest extends TestCase
{
    use RefreshDatabase;

    public function test_formatted_week_startアクセサで週開始日をフォーマットできる(): void
    {
        // Arrange
        $post = Post::factory()->create(['week_start_date' => '2025-01-13']);

        // Assert
        $this->assertEquals('2025年1月13日週', $post->formatted_week_start);
    }
}
```

---

## Model Testing Checklist

When testing Models, ensure:

- [ ] Casts are correctly defined and working
- [ ] Scopes filter data correctly
- [ ] Relationships return correct data
- [ ] Accessors/Mutators transform data correctly
- [ ] Factories create valid model instances
- [ ] RefreshDatabase trait is used for database tests
- [ ] Each test is independent (no test order dependency)

## Model Layer vs UseCase Layer

| Concern | Model Layer | UseCase Layer |
|---------|-------------|---------------|
| **Casts** | ✅ Test here | ❌ Not relevant |
| **Scopes** | ✅ Test here | ❌ Not relevant |
| **Relationships** | ✅ Test here | ❌ Not relevant |
| **Business Logic** | ❌ Don't put here | ✅ Test here |
| **Validation Rules** | ❌ Don't put here | ✅ In FormRequest |
| **Authorization** | ❌ Don't put here | ✅ In Policy |
