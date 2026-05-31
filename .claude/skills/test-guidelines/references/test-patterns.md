# Test Patterns - Code Examples

This reference provides comprehensive code examples for common test patterns using Vitest and React Testing Library.

## Basic Test Structure

### Simple Function Test

```typescript
import { describe, expect, test } from "vitest";
import { calculateTotal } from "./calculateTotal";

describe("calculateTotal", () => {
  test("商品が1つの場合、その価格を返すこと", () => {
    // Arrange
    const items = [{ price: 100 }];
    const expected = 100;

    // Act
    const actual = calculateTotal(items);

    // Assert
    expect(actual).toBe(expected);
  });

  test("商品が複数の場合、合計金額を返すこと", () => {
    // Arrange
    const items = [{ price: 100 }, { price: 200 }, { price: 300 }];
    const expected = 600;

    // Act
    const actual = calculateTotal(items);

    // Assert
    expect(actual).toBe(expected);
  });

  test("商品が空の場合、0を返すこと", () => {
    // Arrange
    const items: Array<{ price: number }> = [];
    const expected = 0;

    // Act
    const actual = calculateTotal(items);

    // Assert
    expect(actual).toBe(expected);
  });
});
```

## Component Testing

### Basic Component Test

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  test("children が表示されること", () => {
    // Arrange
    const expected = "クリック";

    // Act
    render(<Button>{expected}</Button>);
    const actual = screen.getByRole("button", { name: expected });

    // Assert
    expect(actual).toBeInTheDocument();
  });

  test("disabled が true の場合、ボタンが無効化されること", () => {
    // Arrange & Act
    render(<Button disabled>クリック</Button>);
    const actual = screen.getByRole("button");

    // Assert
    expect(actual).toBeDisabled();
  });

  test("クリック時に onClick が呼ばれること", async () => {
    // Arrange
    const handleClick = vi.fn();
    const { user } = render(<Button onClick={handleClick}>クリック</Button>);
    const button = screen.getByRole("button");

    // Act
    await user.click(button);

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Component with Props Test

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  test("variant が primary の場合、適切なスタイルが適用されること", () => {
    // Arrange
    const text = "Primary";

    // Act
    render(<Badge variant="primary">{text}</Badge>);
    const actual = screen.getByText(text);

    // Assert
    expect(actual).toHaveClass("bg-blue-500");
  });

  test("variant が secondary の場合、適切なスタイルが適用されること", () => {
    // Arrange
    const text = "Secondary";

    // Act
    render(<Badge variant="secondary">{text}</Badge>);
    const actual = screen.getByText(text);

    // Assert
    expect(actual).toHaveClass("bg-gray-200");
  });
});
```

## Shared Data Management

### Using Top-Level Describe Scope

```typescript
import { describe, expect, test } from "vitest";
import { formatDate } from "./formatDate";

describe("formatDate", () => {
  // Shared data in top-level describe scope
  const testDate = new Date("2024-01-15T10:30:00");

  test("年月日形式でフォーマットされること", () => {
    // Arrange
    const format = "YYYY-MM-DD";
    const expected = "2024-01-15";

    // Act
    const actual = formatDate(testDate, format);

    // Assert
    expect(actual).toBe(expected);
  });

  test("時分秒を含む形式でフォーマットされること", () => {
    // Arrange
    const format = "YYYY-MM-DD HH:mm:ss";
    const expected = "2024-01-15 10:30:00";

    // Act
    const actual = formatDate(testDate, format);

    // Assert
    expect(actual).toBe(expected);
  });
});
```

### Testing with Multiple Shared Constants

```typescript
import { describe, expect, test } from "vitest";
import { validateEmail } from "./validateEmail";

describe("validateEmail", () => {
  // Valid email patterns
  const validEmails = [
    "user@example.com",
    "test.user@example.co.jp",
    "user+tag@example.com",
  ];

  // Invalid email patterns
  const invalidEmails = [
    "invalid",
    "@example.com",
    "user@",
    "user @example.com",
  ];

  validEmails.forEach((email) => {
    test(`有効なメールアドレス "${email}" が true を返すこと`, () => {
      // Arrange
      const expected = true;

      // Act
      const actual = validateEmail(email);

      // Assert
      expect(actual).toBe(expected);
    });
  });

  invalidEmails.forEach((email) => {
    test(`無効なメールアドレス "${email}" が false を返すこと`, () => {
      // Arrange
      const expected = false;

      // Act
      const actual = validateEmail(email);

      // Assert
      expect(actual).toBe(expected);
    });
  });
});
```

## Testing Error Cases

### Exception Handling Test

```typescript
import { describe, expect, test } from "vitest";
import { divide } from "./divide";

describe("divide", () => {
  test("正常に除算が行われること", () => {
    // Arrange
    const a = 10;
    const b = 2;
    const expected = 5;

    // Act
    const actual = divide(a, b);

    // Assert
    expect(actual).toBe(expected);
  });

  test("0で除算した場合、エラーがスローされること", () => {
    // Arrange
    const a = 10;
    const b = 0;

    // Act & Assert
    expect(() => divide(a, b)).toThrow("Division by zero");
  });

  test("負の数の除算が正しく行われること", () => {
    // Arrange
    const a = -10;
    const b = 2;
    const expected = -5;

    // Act
    const actual = divide(a, b);

    // Assert
    expect(actual).toBe(expected);
  });
});
```

### Async Error Test

```typescript
import { describe, expect, test } from "vitest";
import { fetchUser } from "./fetchUser";

describe("fetchUser", () => {
  test("ユーザーが存在する場合、ユーザー情報を返すこと", async () => {
    // Arrange
    const userId = "valid-user-id";
    const expected = {
      id: userId,
      name: "Test User",
      email: "test@example.com",
    };

    // Act
    const actual = await fetchUser(userId);

    // Assert
    expect(actual).toEqual(expected);
  });

  test("ユーザーが存在しない場合、エラーがスローされること", async () => {
    // Arrange
    const userId = "invalid-user-id";

    // Act & Assert
    await expect(fetchUser(userId)).rejects.toThrow("User not found");
  });
});
```

## Testing Forms

### Form Input Test

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  test("メールアドレスとパスワードが入力できること", async () => {
    // Arrange
    const { user } = render(<LoginForm />);
    const emailInput = screen.getByLabelText("メールアドレス");
    const passwordInput = screen.getByLabelText("パスワード");
    const expectedEmail = "test@example.com";
    const expectedPassword = "password123";

    // Act
    await user.type(emailInput, expectedEmail);
    await user.type(passwordInput, expectedPassword);

    // Assert
    expect(emailInput).toHaveValue(expectedEmail);
    expect(passwordInput).toHaveValue(expectedPassword);
  });

  test("送信ボタンをクリックすると onSubmit が呼ばれること", async () => {
    // Arrange
    const handleSubmit = vi.fn();
    const { user } = render(<LoginForm onSubmit={handleSubmit} />);
    const emailInput = screen.getByLabelText("メールアドレス");
    const passwordInput = screen.getByLabelText("パスワード");
    const submitButton = screen.getByRole("button", { name: "ログイン" });

    // Act
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.click(submitButton);

    // Assert
    expect(handleSubmit).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });
});
```

## Import Organization

### Correct Import Order

```typescript
// 1. External libraries - Testing utilities
import { render, screen } from "@testing-library/react";

// 2. External libraries - Vitest
import { describe, expect, test, vi } from "vitest";

// 3. Component under test
import { ComponentUnderTest } from "./ComponentUnderTest";
```

## Snapshot Testing

### Correct Snapshot Usage

```typescript
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { AccessibleCard } from "./AccessibleCard";

describe("AccessibleCard", () => {
  test("適切なARIA属性が設定されていること", () => {
    // Arrange
    const title = "カードタイトル";
    const content = "カードコンテンツ";

    // Act
    const { container } = render(
      <AccessibleCard title={title} content={content} />
    );

    // Assert - Verify semantic HTML and accessibility attributes
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### Incorrect Snapshot Usage (Avoid)

```typescript
// ❌ Do NOT use snapshots for styling
test("カードが正しくスタイリングされていること", () => {
  const { container } = render(<Card />);
  expect(container).toMatchSnapshot(); // This will break on CSS changes
});

// ✅ Instead, test behavior
test("カードがホバー時にハイライトされること", async () => {
  const { user } = render(<Card />);
  const card = screen.getByRole("article");

  await user.hover(card);

  expect(card).toHaveClass("hover:bg-gray-100");
});
```
