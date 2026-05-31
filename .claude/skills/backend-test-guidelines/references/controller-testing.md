# Controller & Inertia Testing - Feature Tests for Presentation Layer

This reference covers testing patterns for Presentation layer Controllers with Inertia.js in the 7-layer architecture.

## Core Principles

- **Use Database**: Controller tests are feature tests
- **Test Inertia Props**: Verify component name and props structure
- **Test HTTP Flow**: Request → Controller → Response
- **Test Authentication**: Use `actingAs()` for authenticated routes
- **Test Validation**: Verify validation errors are properly returned

---

## Controller/Inertia Testing

**Pattern AI gets wrong**: Only testing response status

```php
// ❌ AI writes: Only checks status code
final class MemberControllerTest extends TestCase
{
    public function test_一覧ページを表示できる(): void
    {
        $response = $this->get(route('members.index'));
        $response->assertStatus(200);
    }
}
```

**Correct pattern**: Test Inertia component and props

```php
// ✅ Correct: Inertia Controller Test
final class MemberControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_一覧ページにメンバーが表示される(): void
    {
        // Arrange
        MemberModel::factory()->count(3)->create();

        // Act
        $response = $this->get(route('members.index'));

        // Assert
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Members/Index')
            ->has('members', 3)
        );
    }

    public function test_メンバーを作成できる(): void
    {
        // Arrange
        $data = [
            'name' => '山田太郎',
            'email' => 'taro@example.com',
        ];

        // Act
        $response = $this->post(route('members.store'), $data);

        // Assert
        $response->assertRedirect(route('members.index'));
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('members', [
            'name' => '山田太郎',
            'email' => 'taro@example.com',
        ]);
    }

    public function test_詳細ページにメンバー情報が表示される(): void
    {
        // Arrange
        $member = MemberModel::factory()->create([
            'name' => '山田太郎',
            'email' => 'taro@example.com',
        ]);

        // Act
        $response = $this->get(route('members.show', $member));

        // Assert
        $response->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Members/Show')
            ->has('member', fn (AssertableInertia $page) => $page
                ->where('id', $member->id)
                ->where('name', '山田太郎')
                ->where('email', 'taro@example.com')
            )
        );
    }

    public function test_バリデーションエラーでリダイレクトされる(): void
    {
        // Arrange
        $data = [
            'name' => '',
            'email' => 'invalid-email',
        ];

        // Act
        $response = $this->post(route('members.store'), $data);

        // Assert
        $response->assertSessionHasErrors(['name', 'email']);
    }

    public function test_未認証ユーザーはログインにリダイレクトされる(): void
    {
        // Act (without authentication)
        $response = $this->get(route('members.index'));

        // Assert
        $response->assertRedirect(route('login'));
    }
}
```

---

## Authentication in Tests

**Pattern AI gets wrong**: Not using authenticated user properly

```php
// ❌ AI writes: No authentication
final class MemberControllerTest extends TestCase
{
    public function test_メンバーを作成できる(): void
    {
        $response = $this->post(route('members.store'), [...]);
        // Fails if route requires auth
    }
}
```

**Correct pattern**: Use actingAs for authenticated tests

```php
// ✅ Correct: Authenticated test
final class MemberControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    public function test_認証済みユーザーはメンバーを作成できる(): void
    {
        // Act
        $response = $this->actingAs($this->user)
            ->post(route('members.store'), [
                'name' => '山田太郎',
                'email' => 'taro@example.com',
            ]);

        // Assert
        $response->assertRedirect(route('members.index'));
        $this->assertDatabaseHas('members', ['email' => 'taro@example.com']);
    }

    public function test_権限のないユーザーは403エラーになる(): void
    {
        // Arrange
        $normalUser = User::factory()->create(['role' => 'viewer']);
        $member = MemberModel::factory()->create();

        // Act
        $response = $this->actingAs($normalUser)
            ->delete(route('members.destroy', $member));

        // Assert
        $response->assertForbidden();
    }
}
```

---

## Advanced Controller Testing Patterns

### Testing Inertia Props Structure

```php
public function test_プロジェクト詳細に必要な情報が含まれる(): void
{
    // Arrange
    $project = ProjectModel::factory()->create([
        'name' => 'テストプロジェクト',
        'description' => 'プロジェクトの説明',
    ]);

    $members = MemberModel::factory()->count(3)->create();
    $project->members()->attach($members->pluck('id'));

    // Act
    $response = $this->actingAs($this->user)
        ->get(route('projects.show', $project));

    // Assert
    $response->assertInertia(fn (AssertableInertia $page) => $page
        ->component('Projects/Show')
        ->has('project', fn (AssertableInertia $page) => $page
            ->where('id', $project->id)
            ->where('name', 'テストプロジェクト')
            ->where('description', 'プロジェクトの説明')
            ->has('members', 3)
            ->has('members.0', fn (AssertableInertia $page) => $page
                ->has('id')
                ->has('name')
                ->has('email')
            )
        )
        ->has('canEdit') // 権限情報
        ->has('canDelete') // 権限情報
    );
}
```

### Testing Form Validation

```php
public function test_必須フィールドが空の場合エラーになる(): void
{
    // Arrange
    $data = [
        'name' => '',
        'email' => '',
        'password' => '',
    ];

    // Act
    $response = $this->actingAs($this->user)
        ->post(route('members.store'), $data);

    // Assert
    $response->assertSessionHasErrors([
        'name' => '名前は必須です',
        'email' => 'メールアドレスは必須です',
        'password' => 'パスワードは必須です',
    ]);
}

public function test_メールアドレスの形式が不正な場合エラーになる(): void
{
    // Arrange
    $data = [
        'name' => '山田太郎',
        'email' => 'invalid-email',
        'password' => 'password123',
    ];

    // Act
    $response = $this->actingAs($this->user)
        ->post(route('members.store'), $data);

    // Assert
    $response->assertSessionHasErrors([
        'email' => 'メールアドレスの形式が正しくありません',
    ]);
}

public function test_重複メールアドレスの場合エラーになる(): void
{
    // Arrange
    MemberModel::factory()->create(['email' => 'taro@example.com']);
    $data = [
        'name' => '山田花子',
        'email' => 'taro@example.com',
        'password' => 'password123',
    ];

    // Act
    $response = $this->actingAs($this->user)
        ->post(route('members.store'), $data);

    // Assert
    $response->assertSessionHasErrors([
        'email' => 'このメールアドレスは既に使用されています',
    ]);
}
```

### Testing Flash Messages

```php
public function test_作成成功時に成功メッセージが表示される(): void
{
    // Act
    $response = $this->actingAs($this->user)
        ->post(route('members.store'), [
            'name' => '山田太郎',
            'email' => 'taro@example.com',
        ]);

    // Assert
    $response->assertRedirect(route('members.index'));
    $response->assertSessionHas('success', 'メンバーを作成しました');
}

public function test_削除成功時に成功メッセージが表示される(): void
{
    // Arrange
    $member = MemberModel::factory()->create();

    // Act
    $response = $this->actingAs($this->user)
        ->delete(route('members.destroy', $member));

    // Assert
    $response->assertRedirect(route('members.index'));
    $response->assertSessionHas('success', 'メンバーを削除しました');
}

public function test_更新失敗時にエラーメッセージが表示される(): void
{
    // Arrange
    $member = MemberModel::factory()->create();
    $data = ['email' => 'invalid-email'];

    // Act
    $response = $this->actingAs($this->user)
        ->put(route('members.update', $member), $data);

    // Assert
    $response->assertSessionHasErrors();
    $response->assertSessionHas('error');
}
```

### Testing Authorization

```php
public function test_管理者は削除できる(): void
{
    // Arrange
    $admin = User::factory()->create(['role' => 'admin']);
    $member = MemberModel::factory()->create();

    // Act
    $response = $this->actingAs($admin)
        ->delete(route('members.destroy', $member));

    // Assert
    $response->assertRedirect(route('members.index'));
    $this->assertDatabaseMissing('members', ['id' => $member->id]);
}

public function test_一般ユーザーは削除できない(): void
{
    // Arrange
    $viewer = User::factory()->create(['role' => 'viewer']);
    $member = MemberModel::factory()->create();

    // Act
    $response = $this->actingAs($viewer)
        ->delete(route('members.destroy', $member));

    // Assert
    $response->assertForbidden();
    $this->assertDatabaseHas('members', ['id' => $member->id]);
}

public function test_自分以外のプロフィールは編集できない(): void
{
    // Arrange
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    // Act
    $response = $this->actingAs($user1)
        ->put(route('profile.update', $user2), [
            'name' => 'New Name',
        ]);

    // Assert
    $response->assertForbidden();
}
```

### Testing JSON API Endpoints

```php
public function test_API経由でメンバー一覧を取得できる(): void
{
    // Arrange
    MemberModel::factory()->count(3)->create();

    // Act
    $response = $this->actingAs($this->user)
        ->getJson(route('api.members.index'));

    // Assert
    $response->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'email', 'created_at'],
            ],
        ]);
}

public function test_API経由でメンバーを作成できる(): void
{
    // Arrange
    $data = [
        'name' => '山田太郎',
        'email' => 'taro@example.com',
    ];

    // Act
    $response = $this->actingAs($this->user)
        ->postJson(route('api.members.store'), $data);

    // Assert
    $response->assertCreated()
        ->assertJsonFragment([
            'name' => '山田太郎',
            'email' => 'taro@example.com',
        ]);

    $this->assertDatabaseHas('members', $data);
}

public function test_API認証なしで401エラーになる(): void
{
    // Act
    $response = $this->getJson(route('api.members.index'));

    // Assert
    $response->assertUnauthorized();
}
```

---

## Controller Testing Checklist

When testing Controllers, ensure:

### Setup
- [ ] Uses `RefreshDatabase` trait
- [ ] Authenticated user created in `setUp()` if needed
- [ ] Test data factories used

### Inertia Tests
- [ ] Component name verified
- [ ] Props structure verified
- [ ] Nested props verified
- [ ] Shared data included (auth, flash messages)

### HTTP Tests
- [ ] GET requests return correct status
- [ ] POST requests create records
- [ ] PUT requests update records
- [ ] DELETE requests remove records
- [ ] Redirects tested

### Validation
- [ ] Required fields validated
- [ ] Format validation tested
- [ ] Uniqueness validation tested
- [ ] Error messages verified

### Authentication
- [ ] Authenticated routes use `actingAs()`
- [ ] Unauthenticated requests redirect to login
- [ ] Guest-only routes redirect authenticated users

### Authorization
- [ ] Admin actions tested
- [ ] User role permissions tested
- [ ] Forbidden actions return 403
- [ ] Ownership checks tested

### Flash Messages
- [ ] Success messages verified
- [ ] Error messages verified
- [ ] Warning messages verified
