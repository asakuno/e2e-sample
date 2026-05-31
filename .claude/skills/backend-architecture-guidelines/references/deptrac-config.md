# Static Analysis with Deptrac

This document explains how to enforce architectural rules using [Deptrac](https://qossmic.github.io/deptrac/), a static analysis tool for PHP dependencies.

## Table of Contents
- [What is Deptrac?](#what-is-deptrac)
- [Layer Dependencies Configuration](#layer-dependencies-configuration)
- [Running Deptrac](#running-deptrac)

---

## What is Deptrac?

Deptrac is a static analysis tool that enforces architectural boundaries in PHP projects. It verifies:
- Layers only depend on allowed layers
- Dependency direction is correct (downward only)
- No circular dependencies

**Benefits**:
- Catches architectural violations at build time
- Prevents accidental coupling
- Documents architectural decisions as code
- Enforces discipline in large teams

---

## Layer Dependencies Configuration

This configuration enforces the 7-layer architecture dependency rules.

```yaml
# deptrac.yaml
deptrac:
  paths:
    - ./app
  layers:
    # 1. Presentation Layer (Controllers)
    - name: Presentation
      collectors:
        - type: directory
          value: app/Http/Controllers/.*

    # 2. Request Layer (Form Requests)
    - name: Request
      collectors:
        - type: directory
          value: app/Http/Requests/.*

    # 3. UseCase Layer
    - name: UseCase
      collectors:
        - type: directory
          value: app/UseCases/.*

    # 4. Service Layer
    - name: Service
      collectors:
        - type: directory
          value: app/Services/.*

    # 5. Repository Layer
    - name: Repository
      collectors:
        - type: directory
          value: app/Repositories/.*

    # 6. Model Layer
    - name: Model
      collectors:
        - type: directory
          value: app/Models/.*

    # 7. Resource Layer
    - name: Resource
      collectors:
        - type: directory
          value: app/Http/Resources/.*

    # Additional layers
    - name: Data
      collectors:
        - type: directory
          value: app/Data/.*

    - name: Policy
      collectors:
        - type: directory
          value: app/Policies/.*

    - name: Enum
      collectors:
        - type: directory
          value: app/Enums/.*

  ruleset:
    # Presentation can depend on: Request, UseCase, Resource
    Presentation:
      - Presentation
      - Request
      - UseCase
      - Resource

    # Request can depend on: Data (DTOs)
    Request:
      - Request
      - Data
      - Enum

    # UseCase can depend on: Repository, Service, Policy, Data
    UseCase:
      - UseCase
      - Repository
      - Service
      - Policy
      - Data
      - Model
      - Enum

    # Service can depend on: Repository, Model
    Service:
      - Service
      - Repository
      - Model
      - Enum

    # Repository can depend on: Model
    Repository:
      - Repository
      - Model
      - Enum

    # Model has no dependencies (bottom layer)
    Model:
      - Model
      - Enum

    # Resource can depend on: Model
    Resource:
      - Resource
      - Model
      - Enum

    # Data (DTOs) has minimal dependencies
    Data:
      - Data
      - Enum

    # Policy can depend on: Model
    Policy:
      - Policy
      - Model

    # Enum has no dependencies
    Enum:
      - Enum
```

**Explanation**:
- `Presentation` can depend on `Request`, `UseCase`, and `Resource` (and itself)
- `Request` can depend on `Data` for DTOs (and itself)
- `UseCase` can depend on `Repository`, `Service`, `Policy`, `Data`, `Model` (and itself)
- `Service` can depend on `Repository` and `Model` (and itself)
- `Repository` can depend on `Model` only (and itself)
- `Model` can only depend on itself and `Enum` (bottom layer)
- `Resource` can depend on `Model` (and itself)

**Violation Examples**:
```php
// In Model layer
use App\Repositories\PostRepository;  // ❌ Deptrac error!

// In UseCase layer
use App\Http\Resources\PostResource;  // ❌ Deptrac error!

// In Repository layer
use App\UseCases\CreatePostUseCase;  // ❌ Deptrac error!
```

---

## Running Deptrac

### Installation

```bash
composer require --dev qossmic/deptrac
```

### Run Analysis

```bash
# Check layer dependencies
./vendor/bin/deptrac analyse

# With specific config file
./vendor/bin/deptrac analyse --config-file=deptrac.yaml

# Fail on uncovered dependencies
./vendor/bin/deptrac analyse --fail-on-uncovered
```

### Add to CI Pipeline

```yaml
# .github/workflows/ci.yml
- name: Deptrac Analysis
  run: ./vendor/bin/deptrac analyse
```

### Add to Quality Checks

```bash
# Full quality check command
./vendor/bin/phpstan analyse && ./vendor/bin/pint --test && ./vendor/bin/phpunit && ./vendor/bin/deptrac
```

### Generate Dependency Graph (Optional)

```bash
# Generate visual dependency graph
./vendor/bin/deptrac analyse --formatter=graphviz-image --output=layer-graph.png
```

---

## Common Deptrac Violations and Fixes

### Violation: Controller directly accessing Model

```php
// ❌ Controller using Model directly
namespace App\Http\Controllers\Api;

use App\Models\Post;

final class PostController extends Controller
{
    public function index()
    {
        return Post::all();  // Deptrac violation!
    }
}
```

**Fix**: Use UseCase and Repository

```php
// ✅ Controller using UseCase
namespace App\Http\Controllers\Api;

use App\UseCases\Post\GetPostsUseCase;

final class PostController extends Controller
{
    public function __construct(
        private GetPostsUseCase $getPostsUseCase,
    ) {}

    public function index(SearchPostsRequest $request)
    {
        $posts = $this->getPostsUseCase->execute(
            $request->getSearchPostsData()
        );

        return PostResource::collection($posts);
    }
}
```

### Violation: UseCase accessing Resource

```php
// ❌ UseCase using Resource
namespace App\UseCases\Post;

use App\Http\Resources\PostResource;  // Deptrac violation!

final class CreatePostUseCase
{
    public function execute(CreatePostData $data): PostResource
    {
        $post = $this->repository->create(...);
        return new PostResource($post);  // Wrong!
    }
}
```

**Fix**: Return Model, let Controller handle Resource

```php
// ✅ UseCase returns Model
namespace App\UseCases\Post;

use App\Models\Post;

final class CreatePostUseCase
{
    public function execute(CreatePostData $data): Post
    {
        return $this->repository->create(...);
    }
}

// Controller wraps with Resource
public function store(StorePostRequest $request): JsonResponse
{
    $post = $this->createPostUseCase->execute($data);
    return response()->json(['data' => new PostResource($post)], 201);
}
```

### Violation: Repository accessing UseCase

```php
// ❌ Repository using UseCase (reverse dependency)
namespace App\Repositories\Post;

use App\UseCases\Post\ValidatePostUseCase;  // Deptrac violation!

final class PostRepository implements PostRepositoryInterface
{
    public function create(...): Post
    {
        // Calling UseCase from Repository is wrong!
        $this->validatePostUseCase->execute(...);
    }
}
```

**Fix**: Keep validation in UseCase

```php
// ✅ Validation in UseCase, not Repository
namespace App\UseCases\Post;

final class CreatePostUseCase
{
    public function execute(CreatePostData $data): Post
    {
        // Validation here
        $this->validateSubmission($data);

        // Repository only handles data access
        return $this->postRepository->create(...);
    }
}
```

---

## Layer Dependency Summary

```
┌─────────────────────────────────────────┐
│  Presentation (Controllers)             │ → Request, UseCase, Resource
├─────────────────────────────────────────┤
│  Request (Form Requests)                │ → Data (DTOs)
├─────────────────────────────────────────┤
│  UseCase (Business Logic)               │ → Repository, Service, Policy, Data
├─────────────────────────────────────────┤
│  Service (Shared Logic)                 │ → Repository, Model
├─────────────────────────────────────────┤
│  Repository (Data Access)               │ → Model
├─────────────────────────────────────────┤
│  Model (Eloquent)                       │ → (no dependencies)
├─────────────────────────────────────────┤
│  Resource (JSON Transformation)         │ → Model
└─────────────────────────────────────────┘
```

**Key Rules**:
- Dependencies flow downward only
- No reverse dependencies allowed
- Model is the bottom layer with no dependencies
- Controller never accesses Model directly
