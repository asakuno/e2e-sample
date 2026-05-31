---
name: test-guidelines
description: Comprehensive testing guidelines for Vitest and React Testing Library. Covers quality standards, AAA pattern, naming conventions, branch coverage, and best practices. Reference this skill when creating or updating test code during Phase 2 (Testing & Stories).
---

# Test Guidelines - Vitest / React Testing Library

This skill defines quality standards, structure, and naming conventions for test code using Vitest and React Testing Library.

## How to Use This Skill

### Quick Reference - Phase 2: Testing & Stories

**テスト作成時:**
- [ ] Quick Referenceチェックリストで品質基準を確認
- [ ] 詳細パターンが必要な場合は`references/`を参照
  - [test-patterns.md](references/test-patterns.md) - 全テストシナリオのコード例
  - [aaa-pattern-guide.md](references/aaa-pattern-guide.md) - AAAパターンの詳細

**test-reviewエージェントとの連携:**
- このスキルの基準でAAA準拠、カバレッジ、命名規則、動作テストを検証

## Quick Reference

Use this checklist when writing or reviewing tests:

- [ ] Explicit imports from `vitest` (no global definitions)
- [ ] Test descriptions in Japanese with specific conditions and expected results
- [ ] AAA pattern strictly followed with `actual` and `expected` variables
- [ ] One test, one assertion (or object comparison for multiple properties)
- [ ] No nested `describe` blocks
- [ ] All branches and exception paths identified and tested
- [ ] Testing behavior, not implementation details
- [ ] Test file named `[ComponentName].test.tsx` or `[functionName].test.ts`
- [ ] Test file placed in the same directory as the component/function
- [ ] Snapshots limited to semantic HTML and accessibility attributes only

## Core Principles

### 1. Explicit Imports

Always import necessary functions from `vitest` explicitly:

```typescript
import { describe, expect, test, vi } from "vitest";
```

**Rationale**: Avoids relying on global definitions, making dependencies clear.

### 2. Descriptive Test Names (Japanese)

Write `describe` and `test` descriptions in Japanese with specific conditions and expected results:

```typescript
test("商品が複数の場合、合計金額を返すこと", () => {
  // ...
});
```

**Format**: "when [condition], it should [result]"

### 3. AAA Pattern (Arrange-Act-Assert)

Strictly follow the AAA pattern with `actual` and `expected` variables:

```typescript
test("商品が1つの場合、その価格を返すこと", () => {
  // Arrange
  const items = [{ price: 100 }];
  const expected = 100;

  // Act
  const actual = calculateTotal(items);

  // Assert
  expect(actual).toBe(expected);
});
```

**Rationale**: Makes tests easier to read, understand, and maintain.

### 4. One Test, One Assertion

Each test verifies one behavior. For multiple properties, use object comparison:

```typescript
// ✅ Correct: Object comparison
test("ユーザー情報が正しいこと", () => {
  const expected = { name: "Taro", age: 30, email: "taro@example.com" };
  const actual = getUser();
  expect(actual).toEqual(expected);
});
```

### 5. Flat Structure (No Nested Describe)

Prohibit nested `describe` blocks. Use descriptive test names instead:

```typescript
// ✅ Correct
describe("UserService", () => {
  test("ユーザーが存在する場合、ユーザー情報を返すこと", () => {});
  test("ユーザーが存在しない場合、エラーがスローされること", () => {});
});
```

### 6. Test Behavior, Not Implementation

Focus on what the component does, not how it does it:

```typescript
// ✅ Testing user-visible behavior
test("カウンターが1増加すること", async () => {
  const { user } = render(<Counter />);
  const button = screen.getByRole("button", { name: "増やす" });
  await user.click(button);
  expect(screen.getByText("1")).toBeInTheDocument();
});
```

## Test Structure Guidelines

### Test File Organization

- **Naming**: `[ComponentName].test.tsx` or `[functionName].test.ts`
- **Location**: Same directory as the component/function being tested
- **Import Order**:
  1. External libraries (Testing utilities)
  2. External libraries (Vitest)
  3. Component or function under test

### Shared Data Management

Place shared data in the top-level `describe` scope:

```typescript
describe("formatDate", () => {
  // Shared data in top-level scope
  const testDate = new Date("2024-01-15T10:30:00");

  test("年月日形式でフォーマットされること", () => {
    // Use shared data
  });
});
```

## When to Create Tests

### Branch Coverage

Identify all branches and exception paths:

- **Conditional logic**: Test all `if`/`else` branches
- **Switch statements**: Test all cases including `default`
- **Error handling**: Test both success and error paths
- **Edge cases**: Test boundary conditions (empty, null, zero, max values)

### Component Testing Focus

Test components based on user-visible behavior:

- **Rendering**: Verify content appears correctly
- **User interactions**: Test clicks, input, form submissions
- **State changes**: Verify UI updates after state changes
- **Accessibility**: Check ARIA attributes and semantic HTML

## Quality Criteria

### Meaningful Coverage

- **Not just line coverage**: Ensure all logical branches are tested
- **Behavior coverage**: Verify all user-facing behaviors
- **Error paths**: Test error handling and edge cases

### Test Maintainability

- **Clear structure**: AAA pattern makes tests easy to understand
- **Descriptive names**: Japanese descriptions explain what is being tested
- **No implementation details**: Tests remain valid when refactoring

### Snapshot Testing Limitations

Use snapshots **only** for:
- Verifying semantic HTML structure
- Checking accessibility attributes (`aria-*`, `role`, etc.)
- Ensuring critical DOM structure remains stable

**Do NOT** use snapshots for:
- CSS class names or inline styles
- Testing visual appearance
- Replacing proper assertions

## Reference Documentation

For detailed code examples and patterns, consult:

- **`references/test-patterns.md`**: Comprehensive examples including:
  - Basic test structure
  - Component testing patterns
  - Shared data management
  - Error case testing
  - Form testing
  - Import organization
  - Snapshot testing usage

- **`references/aaa-pattern-guide.md`**: In-depth AAA pattern guidance including:
  - Why AAA pattern matters
  - actual vs expected variables
  - One test, one assertion principle
  - Common anti-patterns to avoid
  - Testing behavior vs implementation
  - Async testing patterns
  - Branch coverage examples

## Summary

This skill emphasizes:

1. **Structure**: AAA pattern with explicit `actual` and `expected` variables
2. **Clarity**: Japanese test descriptions with specific conditions and results
3. **Coverage**: All branches, edge cases, and error paths tested
4. **Behavior**: Test what users see, not implementation details
5. **Quality**: Meaningful coverage over line coverage metrics

Always prioritize test maintainability and readability over brevity.
