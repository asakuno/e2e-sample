# Repository Testing - Feature Tests with Database

This reference covers testing patterns for Repository layer in the 7-layer architecture.

## Core Principles

- **Use Database**: Repository tests are feature tests with real database
- **Test Interface Implementation**: Test through Repository interface, not Eloquent Model directly
- **CRUD Operations**: Verify all repository methods work correctly
- **Transaction Handling**: Test transaction behavior where applicable

---

## Repository Feature Testing

**Pattern AI gets wrong**: Testing Eloquent Model directly instead of through Repository

```php
// ❌ AI writes: Tests Eloquent Model directly
final class UserRepositoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_ユーザーを保存できる(): void
    {
        User::create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
    }
}
```

**Correct pattern**: Test Repository implementation

```php
// ✅ Correct: Repository Feature Test
final class UserRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private UserRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();
        $this->repository = app(UserRepositoryInterface::class);
    }

    public function test_ユーザーを保存して取得できる(): void
    {
        // Arrange
        $user = User::factory()->make([
            'name' => '山田太郎',
            'email' => 'taro@example.com',
        ]);

        // Act
        $savedUser = $this->repository->create(
            $user->name,
            $user->email,
            'password123'
        );
        $found = $this->repository->findById($savedUser->id);

        // Assert
        $this->assertNotNull($found);
        $this->assertEquals($savedUser->id, $found->id);
        $this->assertEquals('山田太郎', $found->name);
        $this->assertEquals('taro@example.com', $found->email);
    }

    public function test_存在しないIDでnullが返る(): void
    {
        // Act
        $result = $this->repository->findById(99999);

        // Assert
        $this->assertNull($result);
    }

    public function test_メールアドレスで検索できる(): void
    {
        // Arrange
        $user = User::factory()->create([
            'email' => 'taro@example.com',
        ]);

        // Act
        $found = $this->repository->findByEmail('taro@example.com');

        // Assert
        $this->assertNotNull($found);
        $this->assertEquals($user->id, $found->id);
    }

    public function test_ユーザーを削除できる(): void
    {
        // Arrange
        $user = User::factory()->create();

        // Act
        $this->repository->delete($user->id);
        $found = $this->repository->findById($user->id);

        // Assert
        $this->assertNull($found);
    }
}
```

---

## Advanced Repository Testing Patterns

### Testing Update Operations

```php
public function test_ユーザー情報を更新できる(): void
{
    // Arrange - ユーザーを作成
    $user = User::factory()->create([
        'name' => '山田太郎',
        'email' => 'taro@example.com',
    ]);

    // Act - ユーザー情報を更新
    $this->repository->update($user->id, [
        'name' => '山田花子',
        'email' => 'hanako@example.com',
    ]);

    // Assert - 更新されたデータを取得して検証
    $found = $this->repository->findById($user->id);
    $this->assertNotNull($found);
    $this->assertEquals('山田花子', $found->name);
    $this->assertEquals('hanako@example.com', $found->email);
}
```

### Testing Collection Queries

```php
public function test_すべてのユーザーを取得できる(): void
{
    // Arrange
    User::factory()->count(3)->create();

    // Act
    $users = $this->repository->findAll();

    // Assert
    $this->assertCount(3, $users);
    $this->assertContainsOnlyInstancesOf(User::class, $users);
}

public function test_条件に一致するユーザーを検索できる(): void
{
    // Arrange
    User::factory()->create(['email' => 'taro@yamada.com']);
    User::factory()->create(['email' => 'hanako@yamada.com']);
    User::factory()->create(['email' => 'ichiro@sato.com']);

    // Act - ドメイン "yamada.com" のユーザーを検索
    $users = $this->repository->findByEmailDomain('yamada.com');

    // Assert
    $this->assertCount(2, $users);
    foreach ($users as $user) {
        $this->assertStringContainsString('yamada.com', $user->email);
    }
}
```

### Testing Pagination

```php
public function test_ページネーションで取得できる(): void
{
    // Arrange - 15件のユーザーを作成
    User::factory()->count(15)->create();

    // Act - 1ページ目 (10件)
    $page1 = $this->repository->findAllPaginated(perPage: 10, page: 1);

    // Assert
    $this->assertCount(10, $page1->items());
    $this->assertSame(15, $page1->total());
    $this->assertSame(1, $page1->currentPage());
    $this->assertSame(2, $page1->lastPage());

    // Act - 2ページ目 (5件)
    $page2 = $this->repository->findAllPaginated(perPage: 10, page: 2);

    // Assert
    $this->assertCount(5, $page2->items());
    $this->assertSame(2, $page2->currentPage());
}
```

### Testing Transactions

```php
public function test_トランザクションでロールバックされる(): void
{
    // Arrange
    $initialCount = User::count();

    // Act & Assert
    try {
        DB::transaction(function () {
            $this->repository->create('山田太郎', 'taro@example.com', 'password');

            // トランザクション内で例外を発生させる
            throw new \Exception('Rollback test');
        });
    } catch (\Exception $e) {
        // トランザクションがロールバックされているか確認
        $this->assertEquals($initialCount, User::count());
    }
}

public function test_トランザクションでコミットされる(): void
{
    // Arrange
    $initialCount = User::count();

    // Act
    DB::transaction(function () {
        $this->repository->create('山田太郎', 'taro@example.com', 'password');
    });

    // Assert - トランザクション外でもデータが永続化されている
    $this->assertEquals($initialCount + 1, User::count());
    $this->assertDatabaseHas('users', ['email' => 'taro@example.com']);
}
```

### Testing Complex Queries

```php
public function test_複数条件で検索できる(): void
{
    // Arrange
    User::factory()->create([
        'name' => '山田太郎',
        'status' => UserStatus::Active,
        'created_at' => '2024-01-01',
    ]);
    User::factory()->create([
        'name' => '佐藤花子',
        'status' => UserStatus::Active,
        'created_at' => '2024-06-01',
    ]);
    User::factory()->create([
        'name' => '鈴木一郎',
        'status' => UserStatus::Inactive,
        'created_at' => '2024-01-01',
    ]);

    // Act - アクティブかつ2024年上半期に作成されたユーザーを検索
    $users = $this->repository->search(
        status: UserStatus::Active,
        createdFrom: '2024-01-01',
        createdTo: '2024-06-30',
    );

    // Assert
    $this->assertCount(2, $users);
    foreach ($users as $user) {
        $this->assertEquals(UserStatus::Active, $user->status);
    }
}
```

---

## Repository Testing Checklist

When testing Repositories, ensure:

### Setup
- [ ] Uses `RefreshDatabase` trait
- [ ] Repository instance created in `setUp()` via DI container
- [ ] Tests actual database operations

### CRUD Operations
- [ ] Create operation inserts records correctly
- [ ] FindById retrieves correct Model
- [ ] FindById returns null for non-existent ID
- [ ] Update operation modifies existing records
- [ ] Delete operation removes records

### Query Methods
- [ ] Collection queries return arrays/collections of Models
- [ ] Custom finder methods work correctly
- [ ] Pagination works as expected
- [ ] Empty results handled properly

### Edge Cases
- [ ] Null/empty searches return empty collections
- [ ] Duplicate checks work correctly
- [ ] Transaction rollback works
- [ ] Complex queries with multiple criteria work
- [ ] Eager loading relationships work correctly
