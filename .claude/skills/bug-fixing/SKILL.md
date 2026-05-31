---
name: bug-fixing
description: Systematic bug investigation and resolution for Laravel + React/Inertia.js applications. Use when users report bugs, unexpected behavior, errors, or when investigating production issues. Covers bug reproduction, root cause analysis, impact assessment, fix implementation, and testing. Applicable to both frontend (React/TypeScript) and backend (Laravel/PHP) bugs. Triggers when user mentions バグ (bug), エラー (error), 動かない (not working), 期待通りに動作しない (unexpected behavior), テスト失敗 (test failure), 本番問題 (production issue).
---

# Bug Fix

Systematic workflow for investigating and resolving bugs in Laravel + React/Inertia.js applications.

## Overview

This skill provides a structured approach to bug fixing that ensures thorough investigation, proper root cause analysis, and comprehensive testing. It covers the entire bug fix lifecycle from initial report to verified resolution.

Use this skill when:
- Users report unexpected behavior or errors
- Production issues need investigation
- Test failures require root cause analysis
- Code reviews identify potential bugs
- Performance degradation is observed

## Bug Fix Workflow

Follow this workflow sequentially. Do not skip steps unless clearly justified.

### 1. Understand the Bug Report

Gather complete information about the bug:

**Ask clarifying questions:**
- What is the exact error message or unexpected behavior?
- What are the exact steps to reproduce?
- What environment does this occur in? (production, staging, development, local)
- What browser/device/OS is affected?
- When did this start happening? (recent deployment, specific version)
- Is this affecting all users or specific users/roles/data?

**Collect artifacts:**
- Screenshots or screen recordings
- Error logs (backend and frontend console)
- Network request/response (from browser DevTools)
- Sample data that triggers the bug

### 2. Reproduce the Bug

**CRITICAL**: Always reproduce the bug before attempting to fix it.

Follow these steps:
1. Set up the exact environment mentioned in the report
2. Follow the reproduction steps exactly as described
3. Confirm the bug occurs as reported
4. Document the reproduction steps in detail
5. Try variations to understand the scope (different browsers, data, etc.)

If unable to reproduce:
- Request additional information from the reporter
- Check if the issue was already fixed
- Verify environment differences (versions, configuration)

### 3. Investigate Root Cause

Refer to [debugging-checklist.md](references/debugging-checklist.md) for comprehensive investigation steps.

**Key investigation areas:**

#### Logs and Error Messages
- Backend: `storage/logs/laravel.log`
- Frontend: Browser console errors
- Network: Failed API requests in DevTools Network tab

#### Code Analysis
- Recent git changes (`git log`, `git blame`)
- Static analysis (`bun run typecheck`, `./vendor/bin/phpstan analyse`)
- Related functionality and dependencies

#### Database State
- Data integrity checks
- Query logs and performance
- Migration status

### 4. Assess Impact

Before implementing a fix, understand the full scope:

**Impact checklist:**
- [ ] How many users are affected?
- [ ] What functionality is broken?
- [ ] Are there workarounds available?
- [ ] What is the severity? (Critical/High/Medium/Low)
- [ ] Will the fix affect other features?
- [ ] Are there related bugs that should be fixed together?

**Search for similar code:**
```bash
# Find similar patterns
grep -r "similar_pattern" app/ resources/

# Check for related issues
git log --grep="related_keyword"
```

### 5. Plan the Fix

**Determine fix strategy:**
- [ ] Does this fix the root cause or just the symptom?
- [ ] Is this the minimal change needed?
- [ ] Does this follow existing patterns in the codebase?
- [ ] Are there security implications?
- [ ] Will this require a migration or data fix?

**Check against common patterns:**

Consult [common-patterns.md](references/common-patterns.md) to see if this is a known pattern with established solutions. Common categories:
- N+1 query problems (Laravel)
- useEffect infinite loops (React)
- CSRF token issues
- Props type mismatches
- Session management issues

### 6. Implement the Fix

**Follow project architecture:**
- **Backend**: Follow 7-layer architecture (Presentation → Request → UseCase → Service → Repository → Model → Resource)
- **Frontend**: Follow component guidelines (separate concerns, use custom hooks)
- **Security**: Review against security guidelines (`.claude/rules/security/`)
- **Testing**: Follow TDD principles when possible

**Common fix patterns:**

#### N+1 Query Fix (Backend)
```php
// ❌ Before: N+1 problem
$posts = Post::all();
foreach ($posts as $post) {
    echo $post->user->name; // N queries
}

// ✅ After: Eager loading
$posts = Post::with('user')->get();
foreach ($posts as $post) {
    echo $post->user->name; // 1 query
}
```

#### useEffect Infinite Loop Fix (Frontend)
```tsx
// ❌ Before: Missing dependency
useEffect(() => {
    fetchData(filters); // filters not in deps
}, []);

// ✅ After: Correct dependencies
useEffect(() => {
    fetchData(filters);
}, [filters]);
```

#### CSRF Token Fix (Frontend)
```tsx
// ❌ Before: Missing CSRF token
axios.post('/api/posts', data);

// ✅ After: With CSRF token
await getCsrfToken(); // /sanctum/csrf-cookie
axios.post('/api/posts', data, {
    withCredentials: true,
    withXSRFToken: true
});
```

#### Type Mismatch Fix (Frontend/Backend)
```tsx
// ❌ Before: Type mismatch
interface Props {
    userId: string; // Backend sends number
}

// ✅ After: Correct type
interface Props {
    userId: number;
}

// Or add DTO conversion (Backend)
public function toArray(): array
{
    return [
        'user_id' => (string) $this->userId, // Explicit conversion
    ];
}
```

#### Security Fix: SQL Injection Prevention
```php
// ❌ Before: SQL injection vulnerability
$email = $request->input('email');
$user = DB::select("SELECT * FROM users WHERE email = '$email'");

// ✅ After: Parameter binding
$email = $request->input('email');
$user = User::where('email', $email)->first();
// Or: DB::select('SELECT * FROM users WHERE email = ?', [$email]);
```

**Code quality checks:**
```bash
# Backend
./vendor/bin/phpstan analyse
./vendor/bin/pint --test

# Frontend
bun run typecheck
bun run check
```

### 7. Write Tests

**CRITICAL**: Always write a test that reproduces the bug before fixing it.

**Test workflow:**
1. Write a failing test that reproduces the bug
2. Run the test to confirm it fails
3. Implement the fix
4. Run the test to confirm it passes
5. Run all related tests to ensure no regressions

**Test types:**

**Backend:**
```bash
# Run specific test
./vendor/bin/phpunit --filter=test_specific_bug

# Run all related tests
./vendor/bin/phpunit tests/Feature/BugRelatedTest.php
```

**Frontend:**
```bash
# Run specific test
bun run test --run ComponentName.test.tsx

# Run all tests
bun run test

# Check coverage
bun run test --coverage
```

### 8. Verify the Fix

**Local verification:**
- [ ] Bug no longer reproduces with original steps
- [ ] All tests pass
- [ ] No new console errors or warnings
- [ ] Related functionality still works
- [ ] Edge cases are handled

**Quality checks:**
```bash
# Backend full check
./vendor/bin/phpstan analyse && ./vendor/bin/pint --test && ./vendor/bin/phpunit && ./vendor/bin/deptrac

# Frontend full check
bun run typecheck && bun run check && bun run test && bun run build
```

### 9. Document the Fix

**In code:**
- Add comments explaining non-obvious logic
- Update PHPDoc/JSDoc if behavior changed

**In commit message:**
```
fix: [Brief description of the bug]

- Root cause: [Explanation]
- Impact: [Affected functionality]
- Solution: [What was changed and why]

Fixes #[issue-number]
```

**In PR description:**
- Describe the bug clearly
- Explain the root cause
- Show before/after behavior (screenshots/logs)
- List testing performed
- Note any breaking changes or migrations needed

### 10. Monitor After Deployment

After deploying the fix:
- [ ] Verify in staging environment
- [ ] Monitor error logs after production deployment
- [ ] Confirm reporter can no longer reproduce
- [ ] Watch for related issues
- [ ] Update documentation if needed

## Common Pitfalls to Avoid

**DO NOT:**
- Fix symptoms without understanding root cause
- Skip writing tests
- Make changes without reproducing the bug first
- Ignore the impact assessment
- Deploy without proper verification
- Forget to check related functionality

**DO:**
- Reproduce the bug first
- Write a failing test before fixing
- Check for similar issues elsewhere in the codebase
- Verify the fix doesn't introduce regressions
- Document the root cause and solution

## Resources

### references/debugging-checklist.md
Comprehensive checklist covering all aspects of bug investigation:
- Reproduction verification
- Log analysis (backend and frontend)
- Code analysis and static checks
- Impact assessment
- Root cause identification
- Fix validation
- Testing requirements
- Documentation guidelines

### references/common-patterns.md
Collection of frequently encountered bug patterns and their solutions:
- Laravel backend issues (N+1, CSRF, session, security)
- React frontend issues (hooks, state, rendering)
- Inertia.js specific problems
- Security vulnerabilities
- Performance problems

Load these references when you need detailed guidance on specific investigation areas or when you encounter patterns that may have known solutions.
