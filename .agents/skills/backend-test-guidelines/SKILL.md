---
name: backend-test-guidelines
description: Comprehensive PHPUnit and Laravel testing guidelines for 7-layer architecture. Covers Unit tests for UseCase layer (with mocked Repository), Feature tests for Repository/Controller layers. Reference this skill when creating or updating backend test code during Phase 2 (Testing & Review).
---

# Backend Test Guidelines - PHPUnit & Laravel Testing

## Required References

このスキルを読み込んだ後、以下のファイルをReadツールで読み込むこと。

**必須**（常に読み込む）:
- `references/test-structure.md` - テスト構造、AAA パターン、命名規則
- `references/testing-strategy.md` - テスト戦略の全体像

**条件付き**（該当時のみ）:
- `references/usecase-testing.md` - UseCase のユニットテストを作成する場合
- `references/repository-testing.md` - Repository のフィーチャーテストを作成する場合
- `references/controller-testing.md` - Controller のフィーチャーテスト（Inertia/API）を作成する場合
- `references/domain-layer-testing.md` - ドメイン層のテストパターンが必要な場合

---

This skill covers testing patterns for Laravel applications following a 7-layer architecture. It focuses on what AI commonly gets wrong in test design and implementation.

---

## How to Use This Skill

### Quick Reference - Phase 2: Testing & Review

**テスト作成時:**
- [ ] Test Strategy Overviewでテストタイプを確認
- [ ] Quick Referenceで該当レイヤーのパターンを確認
- [ ] 詳細が必要な場合は`references/`の該当ファイルを参照

**テスト後チェック:**
- [ ] AI Weakness Checklistで自己チェック
- [ ] テストカバレッジと品質を確認
- [ ] backend-test-reviewエージェントでレビュー

---

## Test Strategy Overview

| Layer | Test Type | Database | Purpose |
|-------|-----------|----------|---------|
| Model | Unit | No | Casts, scopes, accessors |
| UseCase | Unit | No | UseCase logic with mocked Repository |
| UseCase | Feature | Yes | UseCase integration with real Repository |
| Repository | Feature | Yes | Repository implementation with DB |
| Controller | Feature | Yes | HTTP request/response, Inertia rendering |

## Directory Structure

```
tests/
├── Unit/
│   ├── Models/
│   │   └── {Model}Test.php
│   ├── Services/
│   │   └── {Service}Test.php
│   └── UseCases/
│       └── {Resource}/
│           └── {Action}{Resource}UseCaseTest.php
└── Feature/
    ├── Http/
    │   └── Controllers/
    │       ├── Api/
    │       │   └── {Resource}ControllerTest.php
    │       └── Web/
    │           └── {Resource}PageControllerTest.php
    └── Repositories/
        └── {Resource}/
            └── {Resource}RepositoryTest.php
```

---

## Quick Reference

This table provides a quick overview of test patterns. Click through to detailed documentation for implementation examples.

| Test Type | What to Test | AI Gets Wrong | Correct Pattern | Details |
|-----------|-------------|---------------|-----------------|---------|
| **Model Unit** | Casts, scopes, accessors | Uses database in unit tests | Test casts/scopes with factory | [→ test-structure.md](references/test-structure.md) |
| **UseCase Unit** | UseCase logic | Uses real database | Mock Repository Interface, no DB | [→ usecase-testing.md](references/usecase-testing.md) |
| **Repository Feature** | Repository implementation | Tests Eloquent Model directly | Test through Repository methods | [→ repository-testing.md](references/repository-testing.md) |
| **Controller Feature** | HTTP/Inertia flow | Only checks status code | Inertia assertions, auth, validation | [→ controller-testing.md](references/controller-testing.md) |
| **Test Structure** | AAA, naming, data providers | Inconsistent structure | Japanese names, AAA pattern, factories | [→ test-structure.md](references/test-structure.md) |

### Quick Decision Guide

**"Should I use RefreshDatabase?"**
- ❌ Model Unit tests → NO (for casts/accessors only)
- ❌ UseCase Unit tests → NO
- ✅ Repository Feature tests → YES
- ✅ Controller Feature tests → YES

**"Should I mock the repository?"**
- ✅ UseCase Unit tests → YES (mock Repository Interface)
- ❌ UseCase Feature tests → NO (real implementation)
- ❌ Repository tests → NO (testing the repository itself)

**"What should I test?"**
- Model: Casts, scopes, accessors, relationships
- UseCase: Input DTO → Eloquent Model transformation, error handling
- Repository: CRUD operations, transaction handling
- Controller: Component, props, redirects, validation, auth

---

## AI Weakness Checklist

Before considering test implementation complete:

### Unit Tests ⚠️
- [ ] No database usage (`RefreshDatabase` not needed)
- [ ] Repository Interface is mocked for UseCase tests
- [ ] Both success and error cases tested
- [ ] Model casts and scopes tested

### Feature Tests ⚠️
- [ ] Uses `RefreshDatabase` trait
- [ ] Tests actual database operations
- [ ] Authentication tested (actingAs)
- [ ] Inertia assertions used for Web controller tests
- [ ] JSON assertions used for API controller tests

### Test Structure ⚠️
- [ ] AAA pattern followed
- [ ] Japanese method names
- [ ] Data providers for multiple cases
- [ ] Edge cases covered

### Coverage ⚠️
- [ ] All public methods tested
- [ ] All validation rules tested
- [ ] Error paths tested
- [ ] Authorization tested (Policy)

---

## Summary

| What to Test | How to Test |
|--------------|-------------|
| Model | Unit test casts, scopes, accessors |
| UseCase | Unit test with mocked Repository Interface |
| Repository | Feature test with real database |
| API Controller | Feature test with JSON assertions |
| Web Controller | Feature test with Inertia assertions |
