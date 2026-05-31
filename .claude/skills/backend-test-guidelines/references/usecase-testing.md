# UseCase Testing - Unit Tests with Mocked Dependencies

This reference covers testing patterns for UseCase layer in the 7-layer architecture.

## Core Principles

- **Mock Repository**: UseCase unit tests should mock repository dependencies
- **No Database**: Unit tests verify UseCase logic in isolation
- **Test Both Paths**: Success and error paths should both be tested
- **Verify Interactions**: Confirm repository methods are called with correct parameters

---

## UseCase Unit Testing

**Pattern AI gets wrong**: Not mocking repository, testing with database

```php
// ❌ AI writes: Uses real database
final class CreateMemberUseCaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_メンバーを作成できる(): void
    {
        $useCase = app(CreateMemberUseCase::class); // Gets real implementation

        $output = $useCase->execute(new CreateMemberInput(
            name: 'Test User',
            email: 'test@example.com',
        ));

        $this->assertDatabaseHas('members', ['email' => 'test@example.com']);
    }
}
```

**Correct pattern**: Mock repository for unit test

```php
// ✅ Correct: UseCase Unit Test with mocked repository
final class CreateMemberUseCaseTest extends TestCase
{
    public function test_メンバーを作成できる(): void
    {
        // Arrange
        $repository = $this->createMock(MemberRepositoryInterface::class);
        $repository
            ->expects($this->once())
            ->method('save')
            ->with($this->callback(function (Member $member) {
                return $member->name()->value() === 'Test User'
                    && $member->email()->value() === 'test@example.com';
            }));

        $useCase = new CreateMemberUseCase($repository);

        // Act
        $output = $useCase->execute(new CreateMemberInput(
            name: 'Test User',
            email: 'test@example.com',
        ));

        // Assert
        $this->assertNotEmpty($output->id);
    }

    public function test_無効なメールアドレスで例外が発生する(): void
    {
        // Arrange
        $repository = $this->createMock(MemberRepositoryInterface::class);
        $repository->expects($this->never())->method('save');

        $useCase = new CreateMemberUseCase($repository);

        // Assert
        $this->expectException(InvalidArgumentException::class);

        // Act
        $useCase->execute(new CreateMemberInput(
            name: 'Test User',
            email: 'invalid-email',
        ));
    }

    public function test_名前が空の場合例外が発生する(): void
    {
        // Arrange
        $repository = $this->createMock(MemberRepositoryInterface::class);
        $repository->expects($this->never())->method('save');

        $useCase = new CreateMemberUseCase($repository);

        // Assert
        $this->expectException(InvalidArgumentException::class);

        // Act
        $useCase->execute(new CreateMemberInput(
            name: '',
            email: 'test@example.com',
        ));
    }
}
```

---

## Advanced Mock Patterns

### Verifying Method Calls with Specific Arguments

```php
public function test_メンバーを更新できる(): void
{
    // Arrange
    $memberId = MemberId::from('test-id');
    $existingMember = Member::reconstruct(
        id: $memberId,
        name: Name::create('Old Name'),
        email: Email::create('old@example.com'),
    );

    $repository = $this->createMock(MemberRepositoryInterface::class);
    $repository
        ->expects($this->once())
        ->method('findById')
        ->with($this->callback(fn($id) => $id->equals($memberId)))
        ->willReturn($existingMember);

    $repository
        ->expects($this->once())
        ->method('save')
        ->with($this->callback(function (Member $member) use ($memberId) {
            return $member->id()->equals($memberId)
                && $member->name()->value() === 'New Name'
                && $member->email()->value() === 'new@example.com';
        }));

    $useCase = new UpdateMemberUseCase($repository);

    // Act
    $output = $useCase->execute(new UpdateMemberInput(
        id: 'test-id',
        name: 'New Name',
        email: 'new@example.com',
    ));

    // Assert
    $this->assertSame('test-id', $output->id);
}
```

### Testing UseCase with Multiple Dependencies

```php
public function test_プロジェクトにメンバーを割り当てできる(): void
{
    // Arrange
    $memberRepository = $this->createMock(MemberRepositoryInterface::class);
    $projectRepository = $this->createMock(ProjectRepositoryInterface::class);
    $eventDispatcher = $this->createMock(EventDispatcherInterface::class);

    $member = Member::create(
        name: Name::create('Test User'),
        email: Email::create('test@example.com'),
    );
    $project = Project::create(
        name: ProjectName::create('Test Project'),
        managerId: MemberId::from('manager-id'),
    );

    $memberRepository
        ->expects($this->once())
        ->method('findById')
        ->willReturn($member);

    $projectRepository
        ->expects($this->once())
        ->method('findById')
        ->willReturn($project);

    $projectRepository
        ->expects($this->once())
        ->method('save');

    $eventDispatcher
        ->expects($this->once())
        ->method('dispatch')
        ->with($this->isInstanceOf(MemberAssignedEvent::class));

    $useCase = new AssignMemberToProjectUseCase(
        memberRepository: $memberRepository,
        projectRepository: $projectRepository,
        eventDispatcher: $eventDispatcher,
    );

    // Act
    $output = $useCase->execute(new AssignMemberInput(
        memberId: $member->id()->value(),
        projectId: $project->id()->value(),
    ));

    // Assert
    $this->assertTrue($output->success);
}
```

### Testing Error Cases

```php
public function test_存在しないメンバーで例外が発生する(): void
{
    // Arrange
    $repository = $this->createMock(MemberRepositoryInterface::class);
    $repository
        ->expects($this->once())
        ->method('findById')
        ->willReturn(null); // Member not found

    $repository->expects($this->never())->method('save');

    $useCase = new UpdateMemberUseCase($repository);

    // Assert
    $this->expectException(MemberNotFoundException::class);
    $this->expectExceptionMessage('指定されたメンバーが見つかりません');

    // Act
    $useCase->execute(new UpdateMemberInput(
        id: 'non-existent-id',
        name: 'New Name',
        email: 'new@example.com',
    ));
}

public function test_重複メールアドレスで例外が発生する(): void
{
    // Arrange
    $repository = $this->createMock(MemberRepositoryInterface::class);
    $repository
        ->expects($this->once())
        ->method('findByEmail')
        ->with($this->callback(fn($email) => $email->value() === 'duplicate@example.com'))
        ->willReturn(Member::create(
            name: Name::create('Existing User'),
            email: Email::create('duplicate@example.com'),
        ));

    $repository->expects($this->never())->method('save');

    $useCase = new CreateMemberUseCase($repository);

    // Assert
    $this->expectException(DuplicateEmailException::class);

    // Act
    $useCase->execute(new CreateMemberInput(
        name: 'New User',
        email: 'duplicate@example.com',
    ));
}
```

---

## UseCase Testing Checklist

When testing UseCases, ensure:

### Unit Test Requirements
- [ ] No database access (no RefreshDatabase trait)
- [ ] All repository dependencies are mocked
- [ ] Repository method calls are verified (`expects()`)
- [ ] Repository method arguments are validated (use `callback()`)
- [ ] Repository method return values are stubbed (`willReturn()`)

### Test Coverage
- [ ] Happy path tested (valid input → successful output)
- [ ] Invalid input tested (exception thrown)
- [ ] Edge cases tested (empty values, boundaries)
- [ ] Not found cases tested (null returns from repository)
- [ ] Duplicate cases tested (uniqueness violations)
- [ ] Repository is never called on validation errors

### AAA Pattern
- [ ] Arrange: Set up mocks and test data
- [ ] Act: Execute the UseCase
- [ ] Assert: Verify output and mock interactions

### Output Verification
- [ ] Output DTO contains expected data
- [ ] Output values match expected types
- [ ] Success/failure flags are correct
