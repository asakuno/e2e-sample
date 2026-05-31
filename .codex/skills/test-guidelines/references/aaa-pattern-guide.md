# AAA Pattern Guide and Common Mistakes

This reference provides detailed guidance on the AAA (Arrange-Act-Assert) pattern and common anti-patterns to avoid.

## AAA Pattern Overview

The AAA pattern divides test code into three clear sections:

1. **Arrange**: Set up test data and preconditions
2. **Act**: Execute the code under test
3. **Assert**: Verify the expected outcome

## AAA Pattern Examples

### Correct AAA Pattern

```typescript
test("合計金額を計算すること", () => {
  // Arrange
  const items = [{ price: 100 }, { price: 200 }];
  const expected = 300;

  // Act
  const actual = calculateTotal(items);

  // Assert
  expect(actual).toBe(expected);
});
```

### Why AAA Pattern Matters

**Without AAA Pattern** (Hard to read):
```typescript
// ❌ No clear structure
test("合計金額を計算すること", () => {
  expect(calculateTotal([{ price: 100 }, { price: 200 }])).toBe(300);
});
```

**With AAA Pattern** (Clear and maintainable):
```typescript
// ✅ Clear structure
test("合計金額を計算すること", () => {
  // Arrange
  const items = [{ price: 100 }, { price: 200 }];
  const expected = 300;

  // Act
  const actual = calculateTotal(items);

  // Assert
  expect(actual).toBe(expected);
});
```

## actual vs expected Variables

Always use `actual` and `expected` variables to make comparisons explicit.

### Correct Usage

```typescript
test("ユーザー名が取得できること", () => {
  // Arrange
  const user = { id: 1, name: "Taro", age: 30 };
  const expected = "Taro";

  // Act
  const actual = getUserName(user);

  // Assert
  expect(actual).toBe(expected);
});
```

### Incorrect Usage

```typescript
// ❌ Unclear comparison
test("ユーザー名が取得できること", () => {
  const user = { id: 1, name: "Taro", age: 30 };
  expect(getUserName(user)).toBe("Taro");
});
```

## One Test, One Assertion

Each test should verify one behavior. When comparing multiple properties, use object comparison.

### Correct: Object Comparison

```typescript
test("ユーザー情報が正しいこと", () => {
  // Arrange
  const expected = {
    name: "Taro",
    age: 30,
    email: "taro@example.com",
  };

  // Act
  const actual = getUser();

  // Assert
  expect(actual).toEqual(expected);
});
```

### Incorrect: Multiple Assertions

```typescript
// ❌ Multiple assertions without object comparison
test("ユーザー情報が正しいこと", () => {
  const user = getUser();
  expect(user.name).toBe("Taro");
  expect(user.age).toBe(30);
  expect(user.email).toBe("taro@example.com");
});
```

## Nested Describe Blocks (Prohibited)

Nested `describe` blocks make tests harder to read and maintain. Use flat structure instead.

### Incorrect: Nested Describe

```typescript
// ❌ Nested describe blocks
describe("UserService", () => {
  describe("getUser", () => {
    describe("when user exists", () => {
      test("should return user", () => {
        // ...
      });
    });

    describe("when user does not exist", () => {
      test("should throw error", () => {
        // ...
      });
    });
  });
});
```

### Correct: Flat Structure with Descriptive Test Names

```typescript
// ✅ Flat structure with clear test descriptions
describe("UserService", () => {
  test("ユーザーが存在する場合、ユーザー情報を返すこと", () => {
    // Arrange
    const userId = "existing-user";
    const expected = { id: userId, name: "Taro" };

    // Act
    const actual = getUser(userId);

    // Assert
    expect(actual).toEqual(expected);
  });

  test("ユーザーが存在しない場合、エラーがスローされること", () => {
    // Arrange
    const userId = "non-existing-user";

    // Act & Assert
    expect(() => getUser(userId)).toThrow("User not found");
  });
});
```

## Testing Behavior, Not Implementation

Focus on what the component does, not how it does it.

### Incorrect: Testing Implementation Details

```typescript
// ❌ Testing internal state
test("state が更新されること", () => {
  const { result } = renderHook(() => useCounter());
  expect(result.current.count).toBe(0);
  act(() => result.current.increment());
  expect(result.current.count).toBe(1); // Internal state
});
```

### Correct: Testing Behavior

```typescript
// ✅ Testing user-visible behavior
test("カウンターが1増加すること", async () => {
  // Arrange
  const { user } = render(<Counter />);
  const button = screen.getByRole("button", { name: "増やす" });
  const expected = "1";

  // Act
  await user.click(button);
  const actual = screen.getByText(expected);

  // Assert
  expect(actual).toBeInTheDocument();
});
```

### More Examples

```typescript
// ❌ Testing CSS classes (implementation detail)
test("ボタンが青色であること", () => {
  render(<Button variant="primary">Click</Button>);
  const button = screen.getByRole("button");
  expect(button).toHaveClass("bg-blue-500");
});

// ✅ Testing accessibility and semantics
test("primary ボタンに適切な role が設定されていること", () => {
  // Arrange
  const text = "Click";

  // Act
  render(<Button variant="primary">{text}</Button>);
  const actual = screen.getByRole("button", { name: text });

  // Assert
  expect(actual).toBeInTheDocument();
  expect(actual).toHaveAttribute("type", "button");
});
```

## Combined Arrange and Act (When Appropriate)

For simple assertions without complex logic, you can combine Arrange and Act.

```typescript
test("disabled が true の場合、ボタンが無効化されること", () => {
  // Arrange & Act
  render(<Button disabled>クリック</Button>);
  const actual = screen.getByRole("button");

  // Assert
  expect(actual).toBeDisabled();
});
```

## Testing Edge Cases

Always test boundary conditions and edge cases.

```typescript
describe("calculateDiscount", () => {
  test("通常価格の場合、割引なしで価格を返すこと", () => {
    // Arrange
    const price = 1000;
    const discountRate = 0;
    const expected = 1000;

    // Act
    const actual = calculateDiscount(price, discountRate);

    // Assert
    expect(actual).toBe(expected);
  });

  test("50%割引の場合、半額を返すこと", () => {
    // Arrange
    const price = 1000;
    const discountRate = 0.5;
    const expected = 500;

    // Act
    const actual = calculateDiscount(price, discountRate);

    // Assert
    expect(actual).toBe(expected);
  });

  test("100%割引の場合、0を返すこと", () => {
    // Arrange
    const price = 1000;
    const discountRate = 1.0;
    const expected = 0;

    // Act
    const actual = calculateDiscount(price, discountRate);

    // Assert
    expect(actual).toBe(expected);
  });

  test("負の割引率の場合、エラーがスローされること", () => {
    // Arrange
    const price = 1000;
    const discountRate = -0.1;

    // Act & Assert
    expect(() => calculateDiscount(price, discountRate)).toThrow(
      "Discount rate must be between 0 and 1"
    );
  });
});
```

## Async Testing Patterns

### Correct Async/Await Usage

```typescript
test("非同期でユーザー情報を取得できること", async () => {
  // Arrange
  const userId = "123";
  const expected = { id: userId, name: "Taro" };

  // Act
  const actual = await fetchUser(userId);

  // Assert
  expect(actual).toEqual(expected);
});
```

### Incorrect: Missing await

```typescript
// ❌ Missing await - test will pass even if it should fail
test("非同期でユーザー情報を取得できること", () => {
  const userId = "123";
  const actual = fetchUser(userId); // Promise, not the actual value!
  expect(actual).toEqual({ id: userId, name: "Taro" });
});
```

## Testing Conditional Logic

Ensure all branches are tested.

```typescript
describe("getUserStatus", () => {
  test("ユーザーがアクティブな場合、'Active' を返すこと", () => {
    // Arrange
    const user = { id: 1, isActive: true, isPremium: false };
    const expected = "Active";

    // Act
    const actual = getUserStatus(user);

    // Assert
    expect(actual).toBe(expected);
  });

  test("ユーザーが非アクティブな場合、'Inactive' を返すこと", () => {
    // Arrange
    const user = { id: 1, isActive: false, isPremium: false };
    const expected = "Inactive";

    // Act
    const actual = getUserStatus(user);

    // Assert
    expect(actual).toBe(expected);
  });

  test("ユーザーがプレミアムな場合、'Premium' を返すこと", () => {
    // Arrange
    const user = { id: 1, isActive: true, isPremium: true };
    const expected = "Premium";

    // Act
    const actual = getUserStatus(user);

    // Assert
    expect(actual).toBe(expected);
  });
});
```

## Summary of Common Mistakes

| ❌ Avoid | ✅ Do Instead |
|---------|--------------|
| No AAA pattern | Always use AAA pattern |
| Multiple assertions | Use object comparison |
| Nested `describe` blocks | Use flat structure with descriptive test names |
| Testing implementation details | Test user-visible behavior |
| Missing `await` on async functions | Always `await` async operations |
| Inline expectations | Use `actual` and `expected` variables |
| Incomplete branch coverage | Test all conditional paths |
| Vague test descriptions | Use specific, descriptive Japanese test names |
