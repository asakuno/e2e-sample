# Test Structure & Best Practices

This reference covers general testing best practices including naming conventions, AAA pattern, data providers, and test factories.

---

## Test Method Naming Convention

Use Japanese for test method names with `test_` prefix:

```php
// ✅ Good naming
public function test_有効なメールアドレスで生成できる(): void {}
public function test_無効なメールアドレスは例外が発生する(): void {}
public function test_メンバー一覧を取得できる(): void {}
public function test_存在しないメンバーでnullが返る(): void {}
public function test_認証済みユーザーはアクセスできる(): void {}
public function test_未認証ユーザーはリダイレクトされる(): void {}
```

### Naming Guidelines

- Use descriptive Japanese that explains what the test does
- Start with `test_` prefix (required by PHPUnit)
- Focus on behavior, not implementation details
- Include expected outcome in the name

**Good Examples**:
```php
public function test_メンバーを作成できる(): void {}
public function test_空のメールアドレスで例外が発生する(): void {}
public function test_管理者権限がない場合403エラーになる(): void {}
public function test_ページネーションで10件ずつ取得できる(): void {}
```

**Bad Examples**:
```php
public function testCreate(): void {} // Too vague, not Japanese
public function test_it_works(): void {} // Not Japanese
public function test_saveメソッドのテスト(): void {} // Focuses on method, not behavior
public function test_test(): void {} // Meaningless
```

---

## AAA Pattern (Arrange-Act-Assert)

Always structure tests with clear sections:

```php
public function test_メンバーを作成できる(): void
{
    // Arrange - テストデータと依存の準備
    $repository = $this->createMock(MemberRepositoryInterface::class);
    $repository->expects($this->once())->method('save');
    $useCase = new CreateMemberUseCase($repository);

    // Act - テスト対象の実行
    $output = $useCase->execute(new CreateMemberInput(
        name: 'Test User',
        email: 'test@example.com',
    ));

    // Assert - 結果の検証
    $this->assertNotEmpty($output->id);
}
```

### Arrange Phase

Set up test preconditions and inputs:
- Create test data
- Set up mocks and stubs
- Initialize dependencies
- Prepare expected values

```php
// Arrange
$name = Name::create('山田太郎');
$email = Email::create('taro@example.com');
$repository = $this->createMock(MemberRepositoryInterface::class);
$repository->expects($this->once())->method('save');
$useCase = new CreateMemberUseCase($repository);
```

### Act Phase

Execute the code under test:
- Call the method/function being tested
- Capture the result
- Keep this section minimal (usually one line)

```php
// Act
$output = $useCase->execute(new CreateMemberInput(
    name: 'Test User',
    email: 'test@example.com',
));
```

### Assert Phase

Verify the results:
- Check return values
- Verify state changes
- Confirm expected exceptions
- Validate mock interactions

```php
// Assert
$this->assertNotEmpty($output->id);
$this->assertSame('Test User', $output->name);
```

---

## Data Providers

Use data providers for testing multiple cases:

### Basic Data Provider

```php
/**
 * @dataProvider 有効な入力データ
 */
public function test_有効なデータでメンバーを作成できる(
    string $name,
    string $email,
): void {
    // Arrange
    $repository = $this->createMock(MemberRepositoryInterface::class);
    $repository->expects($this->once())->method('save');
    $useCase = new CreateMemberUseCase($repository);

    // Act
    $output = $useCase->execute(new CreateMemberInput(
        name: $name,
        email: $email,
    ));

    // Assert
    $this->assertNotEmpty($output->id);
}

public static function 有効な入力データ(): array
{
    return [
        'standard' => ['山田太郎', 'taro@example.com'],
        'long_name' => [str_repeat('あ', 255), 'long@example.com'],
        'subdomain_email' => ['佐藤花子', 'hanako@sub.example.com'],
    ];
}
```

### Data Provider for Error Cases

```php
/**
 * @dataProvider 無効な入力データ
 */
public function test_無効なデータで例外が発生する(
    string $name,
    string $email,
    string $expectedError,
): void {
    // Arrange
    $repository = $this->createMock(MemberRepositoryInterface::class);
    $repository->expects($this->never())->method('save');
    $useCase = new CreateMemberUseCase($repository);

    // Assert
    $this->expectException(InvalidArgumentException::class);
    $this->expectExceptionMessage($expectedError);

    // Act
    $useCase->execute(new CreateMemberInput(
        name: $name,
        email: $email,
    ));
}

public static function 無効な入力データ(): array
{
    return [
        'empty_name' => ['', 'test@example.com', '名前は必須です'],
        'invalid_email' => ['Test', 'invalid', '無効なメールアドレス'],
        'too_long_name' => [str_repeat('a', 256), 'test@example.com', '名前は255文字以内'],
    ];
}
```

### Complex Data Provider

```php
/**
 * @dataProvider メンバー検索条件
 */
public function test_条件に応じてメンバーを検索できる(
    array $searchParams,
    int $expectedCount,
    array $expectedEmails,
): void {
    // Arrange
    $this->seedMembers();

    // Act
    $members = $this->repository->search(new MemberSearchCriteria(
        namePattern: $searchParams['name'] ?? null,
        emailDomain: $searchParams['email_domain'] ?? null,
        status: $searchParams['status'] ?? null,
    ));

    // Assert
    $this->assertCount($expectedCount, $members);
    foreach ($members as $index => $member) {
        $this->assertSame($expectedEmails[$index], $member->email()->value());
    }
}

public static function メンバー検索条件(): array
{
    return [
        'name_pattern' => [
            ['name' => '山田'],
            2,
            ['taro@example.com', 'hanako@example.com'],
        ],
        'email_domain' => [
            ['email_domain' => 'example.com'],
            3,
            ['taro@example.com', 'hanako@example.com', 'ichiro@example.com'],
        ],
        'active_only' => [
            ['status' => 'active'],
            2,
            ['taro@example.com', 'hanako@example.com'],
        ],
    ];
}
```

---

## Factory Usage

### Domain Test Factory

Create custom factories for domain testing:

```php
final class MemberTestFactory
{
    public static function create(
        ?Name $name = null,
        ?Email $email = null,
    ): Member {
        return Member::create(
            name: $name ?? Name::create('テストユーザー'),
            email: $email ?? Email::create('test@example.com'),
        );
    }

    public static function createWithId(
        string $id,
        ?Name $name = null,
        ?Email $email = null,
    ): Member {
        return Member::reconstruct(
            id: MemberId::from($id),
            name: $name ?? Name::create('テストユーザー'),
            email: $email ?? Email::create('test@example.com'),
        );
    }

    public static function createActive(): Member
    {
        return Member::create(
            name: Name::create('アクティブユーザー'),
            email: Email::create('active@example.com'),
            status: MemberStatus::Active,
        );
    }

    public static function createInactive(): Member
    {
        return Member::create(
            name: Name::create('非アクティブユーザー'),
            email: Email::create('inactive@example.com'),
            status: MemberStatus::Inactive,
        );
    }
}
```

### Using Domain Test Factory

```php
public function test_アクティブメンバーのみ取得できる(): void
{
    // Arrange
    $activeMember1 = MemberTestFactory::createActive();
    $activeMember2 = MemberTestFactory::createActive();
    $inactiveMember = MemberTestFactory::createInactive();

    $this->repository->save($activeMember1);
    $this->repository->save($activeMember2);
    $this->repository->save($inactiveMember);

    // Act
    $members = $this->repository->findByStatus(MemberStatus::Active);

    // Assert
    $this->assertCount(2, $members);
}
```

### Laravel Model Factory

Use Laravel factories for Feature tests:

```php
// database/factories/MemberModelFactory.php
class MemberModelFactory extends Factory
{
    protected $model = MemberModel::class;

    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'inactive',
        ]);
    }

    public function withEmail(string $email): static
    {
        return $this->state(fn (array $attributes) => [
            'email' => $email,
        ]);
    }
}
```

### Using Laravel Model Factory

```php
public function test_メンバー一覧を取得できる(): void
{
    // Arrange
    MemberModel::factory()->count(5)->create();
    MemberModel::factory()->inactive()->count(3)->create();

    // Act
    $response = $this->actingAs($this->user)
        ->get(route('members.index'));

    // Assert
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Members/Index')
        ->has('members', 8)
    );
}

public function test_特定のメールアドレスで検索できる(): void
{
    // Arrange
    MemberModel::factory()->withEmail('target@example.com')->create();
    MemberModel::factory()->count(5)->create();

    // Act
    $response = $this->actingAs($this->user)
        ->get(route('members.index', ['email' => 'target@example.com']));

    // Assert
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->has('members', 1)
        ->has('members.0', fn (AssertableInertia $page) => $page
            ->where('email', 'target@example.com')
        )
    );
}
```

---

## General Testing Best Practices

### Test Independence

Each test should be independent and not rely on other tests:

```php
// ✅ Good: Independent tests
public function test_メンバーを作成できる(): void
{
    $member = MemberTestFactory::create();
    $this->repository->save($member);

    $found = $this->repository->findById($member->id());
    $this->assertNotNull($found);
}

public function test_メンバーを削除できる(): void
{
    $member = MemberTestFactory::create();
    $this->repository->save($member);

    $this->repository->delete($member->id());

    $found = $this->repository->findById($member->id());
    $this->assertNull($found);
}

// ❌ Bad: Tests depend on execution order
private Member $sharedMember;

public function test_first_create(): void
{
    $this->sharedMember = MemberTestFactory::create();
    $this->repository->save($this->sharedMember);
}

public function test_second_update(): void
{
    // Fails if test_first_create didn't run!
    $this->repository->save($this->sharedMember);
}
```

### One Assertion Concept Per Test

Focus each test on a single concept:

```php
// ✅ Good: Single concept
public function test_有効なメールアドレスで生成できる(): void
{
    $email = Email::create('test@example.com');
    $this->assertSame('test@example.com', $email->value());
}

public function test_無効なメールアドレスは例外が発生する(): void
{
    $this->expectException(InvalidArgumentException::class);
    Email::create('invalid-email');
}

// ❌ Bad: Multiple concepts
public function test_email(): void
{
    // Tests creation AND validation in same test
    $email = Email::create('test@example.com');
    $this->assertSame('test@example.com', $email->value());

    $this->expectException(InvalidArgumentException::class);
    Email::create('invalid-email');
}
```

### Descriptive Assertion Messages

Add custom messages for complex assertions:

```php
public function test_複雑な検証条件(): void
{
    // Arrange
    $member = MemberTestFactory::create();

    // Act
    $result = $this->validator->validate($member);

    // Assert
    $this->assertTrue(
        $result->isValid(),
        sprintf(
            'Expected validation to pass, but got errors: %s',
            implode(', ', $result->getErrors())
        )
    );
}
```

---

## Testing Best Practices Checklist

- [ ] AAA pattern consistently used
- [ ] Japanese test method names
- [ ] Data providers for multiple similar cases
- [ ] Test factories for complex object creation
- [ ] Each test is independent
- [ ] One concept per test
- [ ] Descriptive assertion messages for complex cases
- [ ] Setup/teardown in `setUp()`/`tearDown()`
- [ ] No shared mutable state between tests
- [ ] Tests run in any order
