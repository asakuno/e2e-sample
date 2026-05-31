---
name: backend-coding-guidelines
description: Comprehensive Laravel backend coding guidelines for 7-layer architecture (Laravel-native). **CRITICAL**: Focuses on patterns AI commonly fails to implement correctly, especially UseCase structure, Repository pattern, and layer separation. Reference this skill when implementing or refactoring backend code during Phase 2.
---

# Backend Coding Guidelines - What AI Gets Wrong

## Required References

このスキルを読み込んだ後、以下のファイルをReadツールで読み込むこと。

**必須**（常に読み込む）:
- `references/usecase-structure.md` - UseCase 構造の詳細パターン
- `references/repository-pattern.md` - Repository パターンの詳細実装
- `references/layer-separation.md` - レイヤー分離ルールの詳細

**条件付き**（該当時のみ - 以下の判断基準に従って読み込む）:
- `references/dto-laravel-data.md` - 読み込み条件:
  - DTOクラス（`*Data.php`）を新規作成・変更する場合
  - FormRequest で DTO への変換を実装する場合
  - `spatie/laravel-data` の機能を使用する場合
- `references/inertia-backend.md` - 読み込み条件:
  - Web Controller（`*PageController.php`）を実装する場合
  - `Inertia::render()` を使用するレスポンスを実装する場合
  - Shared Data や Deferred Props を設定する場合
- `references/coding-standards.md` - 読み込み条件:
  - 新規ファイルを作成する場合（命名規則・構造の確認）
  - コードレビューで規約違反を指摘された場合
- `references/best-practices.md` - 読み込み条件:
  - アーキテクチャ判断で迷った場合
  - 既存コードのリファクタリングを行う場合
- `references/entity-design.md` - 読み込み条件:
  - Eloquent Model を新規作成・変更する場合
- `references/valueobject-design.md` - 読み込み条件:
  - Value Object クラスを新規作成する場合
- `references/module-isolation.md` - 読み込み条件:
  - 新規モジュール（機能領域）を追加する場合
  - deptrac の依存ルールを変更する場合
- `references/layer-details.md` - 読み込み条件:
  - レイヤー間の責務境界が不明確な場合
  - 新しいレイヤー要素を追加する場合

---

This skill focuses on patterns AI commonly fails to implement correctly in Laravel applications following a 7-layer Laravel-native architecture.

## Table of Contents

1. [How to Use This Skill](#how-to-use-this-skill)
2. [Architecture Overview](#architecture-overview)
3. [AI's Critical Weaknesses - Quick Reference](#ais-critical-weaknesses---quick-reference)
4. [Naming Conventions](#naming-conventions)
5. [Method Naming](#method-naming)
6. [Class Modifiers](#class-modifiers)
7. [Prohibited Patterns](#prohibited-patterns)
8. [AI Weakness Checklist](#ai-weakness-checklist)
9. [Summary: What to Watch For](#summary-what-to-watch-for)

---

## How to Use This Skill

### Quick Reference - Phase 2: Implementation & Review

**実装前チェック:**
- [ ] 実装対象に応じたパターンを確認（UseCase/Repository/Service/DTO）
- [ ] AI's Critical Weaknessesセクションで注意点を把握
- [ ] Prohibited Patternsを確認

**実装後チェック:**
- [ ] AI Weakness Checklistで自己チェック
- [ ] 禁止パターンが使用されていないか確認
- [ ] レイヤー分離ルールが守られているか確認

**詳細な規約:**
- `.claude/rules/backend/` - レイヤー構造、DTO、テスト、コーディング規約の詳細

---

## Architecture Overview

**7-Layer Structure (Laravel-native):**
```
┌─────────────────────────────────────────┐
│  Presentation (Controllers)             │ ← HTTP Request/Response
├─────────────────────────────────────────┤
│  Request (FormRequests)                 │ ← Validation & DTO Conversion
├─────────────────────────────────────────┤
│  UseCase (Business Logic)               │ ← Application Logic
├─────────────────────────────────────────┤
│  Service (Shared Logic)                 │ ← Reusable Business Logic
├─────────────────────────────────────────┤
│  Repository (Data Access)               │ ← Data Abstraction
├─────────────────────────────────────────┤
│  Model (Eloquent)                       │ ← Domain Models
├─────────────────────────────────────────┤
│  Resource (JSON Transformation)         │ ← Response Transformation
└─────────────────────────────────────────┘
```

**Directory Structure (`app/` 配下にフラット配置):**
```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Api/              # API Controllers
│   │   └── Web/              # Web Controllers（Inertia.js）
│   ├── Requests/             # FormRequests
│   └── Resources/            # API Resources
├── UseCases/                 # UseCases
├── Services/                 # Services
├── Repositories/             # Repositories
├── Data/                     # DTOs（Laravel Data）
├── Models/                   # Eloquent Models
├── Policies/                 # Policies
└── Enums/                    # Enums
```

**Dependency Direction:**
```
Presentation → Request → UseCase → Service/Repository → Model → Resource
```
- 下位層から上位層への依存は禁止
- UseCase は Repository Interface 経由でアクセス

---

## AI's Critical Weaknesses - Quick Reference

### 1. UseCase Structure ⚠️ MOST CRITICAL

**AI gets wrong**: Business logic in controller, no DTOs, or returning Eloquent Models directly

**Correct pattern**:
- Input DTO (Laravel Data) for parameters
- Output via DTO（Laravel Data）。Model を上位層に直接返さない
- Uses Repository interface (not Model directly in complex cases)
- Class marked as `final`

```php
// ✅ Correct pattern
final class CreatePostUseCase
{
    public function __construct(
        private PostRepositoryInterface $postRepository,
    ) {}

    public function execute(CreatePostData $data): PostData
    {
        // ドメインバリデーション
        $existingPost = $this->postRepository->findByUserAndWeek(
            $data->userId,
            $data->weekStartDate
        );

        if ($existingPost !== null) {
            throw ValidationException::withMessages([
                'week_start_date' => ['この週のレポートは既に存在します。'],
            ]);
        }

        // データ作成
        $post = $this->postRepository->create(
            $data->userId,
            $data->weekStartDate,
            $data->title,
            $data->memo,
            $data->status,
            $data->tagValues
        );

        // DTO に変換して返す（Model を上位層に返さない）
        return PostData::from($post);
    }
}
```

👉 **詳細**: `.claude/rules/backend/02-layers.md`

---

### 2. Repository Pattern ⚠️

**AI gets wrong**: Controller directly using Eloquent Model, or Repository returning incorrect types

**Correct pattern**:
- Interface in `Repositories/` directory
- Implementation in same directory or separate (for testing)
- Returns Eloquent Model (not raw arrays)
- Encapsulates complex queries and transactions

```php
// ✅ Correct pattern: Interface
interface PostRepositoryInterface
{
    public function findById(int $id): ?Post;
    public function findByUserAndWeek(int $userId, string $weekStartDate): ?Post;
    public function create(
        int $userId,
        string $weekStartDate,
        string $title,
        ?string $memo,
        PostStatus $status,
        array $tagValues
    ): Post;
}

// ✅ Correct pattern: Implementation
final class PostRepository implements PostRepositoryInterface
{
    public function findById(int $id): ?Post
    {
        return Post::find($id);
    }

    public function create(...): Post
    {
        return DB::transaction(function () use (...) {
            $post = Post::create([...]);
            $post->tags()->attach($tagValues);
            return $post->fresh(['tags']);
        });
    }
}
```

👉 **詳細**: `.claude/rules/backend/02-layers.md`

---

### 3. DTO Design (Laravel Data) ⚠️

**AI gets wrong**: Not using Laravel Data, missing TypeScript generation attributes, or mutable DTOs

**Correct pattern**:
- Use `spatie/laravel-data`
- Add `#[TypeScript()]` attribute for type generation
- All properties `readonly`
- Use `#[MapName(SnakeCaseMapper::class)]` for case conversion

```php
// ✅ Correct pattern
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\MapName;
use Spatie\LaravelData\Mappers\SnakeCaseMapper;
use Spatie\TypeScriptTransformer\Attributes\TypeScript;

#[TypeScript()]
#[MapName(SnakeCaseMapper::class)]
final class CreatePostData extends Data
{
    public function __construct(
        public readonly int $userId,
        public readonly string $weekStartDate,
        #[Max(255)]
        public readonly string $title,
        #[Max(1000)]
        public readonly ?string $memo,
        public readonly PostStatus $status,
        /** @var array<TagValueData> */
        #[DataCollectionOf(TagValueData::class)]
        public readonly array $tagValues,
    ) {}
}
```

👉 **詳細**: `.claude/rules/backend/03-dto-data.md`

---

### 4. Layer Separation ⚠️

**AI gets wrong**: Cross-layer dependencies (Controller → Model directly, UseCase → HTTP concerns)

**Correct pattern**:
- Controller only handles HTTP, calls UseCase
- UseCase contains business logic, uses Repository
- Repository encapsulates data access
- FormRequest handles validation and DTO conversion

```php
// ✅ Correct: Controller uses UseCase only
class PostController extends Controller
{
    public function store(StorePostRequest $request): JsonResponse
    {
        $data = $request->getCreatePostData();
        $post = $this->createPostUseCase->execute($data);

        return response()->json([
            'data' => new PostResource($post),
        ], 201);
    }
}

// ✅ Correct: FormRequest converts to DTO
class StorePostRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            // ...
        ];
    }

    public function getCreatePostData(): CreatePostData
    {
        return CreatePostData::from([
            'user_id' => auth()->id(),
            'title' => $this->input('title'),
            // ...
        ]);
    }
}
```

👉 **詳細**: `.claude/rules/backend/02-layers.md`

---

### 5. Web vs API Controllers ⚠️

**AI gets wrong**: Putting dynamic data in Web Controllers, or mixing concerns

**Correct pattern**:
- Web Controllers: Initial page render only, static master data
- API Controllers: CRUD operations, dynamic data
- Naming: `{Resource}PageController` for Web, `{Resource}Controller` for API

```php
// ✅ Correct: Web Controller (static data only)
class PostPageController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Post/Index', [
            'statusOptions' => PostStatus::toSelectArray(), // 静的データ
            'filters' => $request->only(['q', 'status']),
        ]);
        // 動的データは React 側から API 経由で取得
    }
}

// ✅ Correct: API Controller (dynamic data)
class PostController extends Controller
{
    public function index(SearchPostsRequest $request): JsonResponse
    {
        $posts = $this->getPostsUseCase->execute($request->getSearchData());
        return response()->json([
            'data' => PostResource::collection($posts),
        ]);
    }
}
```

👉 **詳細**: `.claude/rules/backend/05-inertia-backend.md`

---

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Web Controller | `{Resource}PageController` | `PostPageController` |
| API Controller | `{Resource}Controller` | `PostController` |
| UseCase | `{Action}{Resource}UseCase` | `CreatePostUseCase` |
| Repository Interface | `{Resource}RepositoryInterface` | `PostRepositoryInterface` |
| Repository | `{Resource}Repository` | `PostRepository` |
| FormRequest (作成) | `Store{Resource}Request` | `StorePostRequest` |
| FormRequest (更新) | `Update{Resource}Request` | `UpdatePostRequest` |
| DTO | `Create/Update{Resource}Data` | `CreatePostData` |
| Resource | `{Resource}Resource` | `PostResource` |
| Service | `{Resource}{Function}Service` | `PostExportService` |
| Eloquent Model | `{Resource}` | `Post` |
| Policy | `{Resource}Policy` | `PostPolicy` |

---

## Method Naming

| Purpose | Method Name |
|---------|-------------|
| UseCase execution | `execute` |
| Find single | `findById`, `findBy{Property}` |
| Find multiple | `findAll`, `findBy{Criteria}` |
| Create | `create` |
| Update | `update` |
| Delete | `delete` |
| DTO conversion | `get{Action}{Resource}Data` |

---

## Class Modifiers

```php
// UseCase: final
final class CreatePostUseCase
{
    public function __construct(
        private PostRepositoryInterface $repository,
    ) {}
}

// DTO (Laravel Data): final class + readonly プロパティ
// ※ Data クラスが non-readonly のため readonly class は使用不可
#[TypeScript()]
final class CreatePostData extends Data
{
    public function __construct(
        public readonly int $userId,
        // ...
    ) {}
}

// Repository Implementation: final
final class PostRepository implements PostRepositoryInterface {}

// Service: final
final class PostExportService {}

// Controller: NOT final (テスト時のモック作成のため)
class PostController extends Controller {}

// Model: NOT final (Laravel の仕様)
class Post extends Model {}
```

---

## Prohibited Patterns

### In Controller
- ❌ Business logic
- ❌ Direct Model access (`Post::where(...)`)
- ❌ Data transformation logic

### In UseCase
- ❌ HTTP-specific logic (`Request`, `Response`)
- ❌ Direct `DB::` queries (use Repository)
- ❌ Returning raw arrays (return Model or DTO)
- ❌ Returning Eloquent Model to upper layers（Controller に Model を直接返す）
  - 正しいフロー: `UseCase → DTO → Controller → Resource(DTO) → JSON`
- ❌ セッション操作（`session()->regenerate()`, `session()->invalidate()`, `session()->regenerateToken()`）
  - セッション操作は HTTP 層の関心事であり、Controller 層で行う。UseCase は HTTP 層に依存しない

### In Repository
- ❌ Business logic (only data access)
- ❌ HTTP concerns

### General
- ❌ `@inertiajs/react` の `useForm`（Laravel Precognition を使用）
- ❌ Web Controllers での動的データ提供（API 経由）
- ❌ ハードコードされた URL（Wayfinder 使用）

---

## AI Weakness Checklist

Before considering implementation complete, verify AI didn't fall into these traps:

### UseCase ⚠️ (Most Critical)
- [ ] Controller は UseCase を呼び出すのみ（ビジネスロジックなし）
- [ ] UseCase は Input DTO (Laravel Data) を受け取る
- [ ] UseCase は Repository Interface を使用
- [ ] UseCase は `final` class
- [ ] UseCase の戻り値は DTO（Model を上位層に返していない）
- [ ] ドメインバリデーションは UseCase 内

### Repository ⚠️
- [ ] Interface と Implementation が分離されている
- [ ] トランザクション制御は Repository 内
- [ ] Eloquent Model を返す（生配列ではない）
- [ ] Implementation は `final` class

### DTO ⚠️
- [ ] `spatie/laravel-data` を使用
- [ ] `#[TypeScript()]` attribute が付与されている
- [ ] `readonly` property を使用
- [ ] FormRequest に DTO 変換メソッドがある

### Layer Separation ⚠️
- [ ] Controller は HTTP handling のみ
- [ ] UseCase はビジネスロジックのみ
- [ ] Repository はデータアクセスのみ
- [ ] 下位層から上位層への依存がない

### Web vs API ⚠️
- [ ] Web Controllers は静的データのみ提供
- [ ] 動的データは API 経由で取得
- [ ] Web Controller は `{Resource}PageController` 命名

---

## Summary: What to Watch For

AI will confidently write code that:
1. **Puts business logic in Controller** (should be in UseCase)
2. **Accesses Model directly from Controller** (should use UseCase → Repository)
3. **Skips DTO conversion** in FormRequest
4. **Missing TypeScript generation** attributes on DTOs
5. **Provides dynamic data in Web Controllers** (should use API)

**Trust AI for**:
- Basic PHP syntax
- Simple CRUD operations
- Controller routing

**Scrutinize AI for**:
- UseCase structure (DTO required)
- Repository pattern (Interface + Implementation)
- Layer boundaries (no cross-layer dependencies)
- Web vs API Controller responsibility

When in doubt, ask: **"Is each layer handling only its responsibility?"**
