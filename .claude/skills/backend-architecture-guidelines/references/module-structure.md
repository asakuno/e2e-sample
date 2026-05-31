# Directory Structure and Layer Organization

This document explains how to organize code in the 7-layer Laravel-native architecture.

## Table of Contents
- [Directory Layout](#directory-layout)
- [Layer Dependencies](#layer-dependencies)
- [File Naming Conventions](#file-naming-conventions)
- [Service Provider Bindings](#service-provider-bindings)

---

## Directory Layout

The 7-layer architecture uses Laravel's standard `app/` directory with organized subdirectories.

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Controller.php              # Base controller
│   │   ├── Api/                        # API Controllers (REST API)
│   │   │   ├── PostController.php
│   │   │   └── TagController.php
│   │   └── Web/                        # Web Controllers (Inertia.js)
│   │       ├── PostPageController.php
│   │       └── DashboardPageController.php
│   │
│   ├── Requests/                       # Form Requests (Validation)
│   │   ├── Post/
│   │   │   ├── StorePostRequest.php
│   │   │   ├── UpdatePostRequest.php
│   │   │   └── SearchPostsRequest.php
│   │   └── Tag/
│   │       └── StoreTagRequest.php
│   │
│   ├── Resources/                      # API Resources (Response)
│   │   ├── PostResource.php
│   │   └── TagResource.php
│   │
│   └── Middleware/
│       ├── HandleInertiaRequests.php
│       └── SecurityHeadersMiddleware.php
│
├── UseCases/                           # Business Logic
│   ├── Post/
│   │   ├── CreatePostUseCase.php
│   │   ├── UpdatePostUseCase.php
│   │   ├── DeletePostUseCase.php
│   │   └── GetPostsUseCase.php
│   └── Tag/
│       └── CreateTagUseCase.php
│
├── Services/                           # Shared Business Logic
│   ├── Post/
│   │   └── PostExportService.php
│   └── Dashboard/
│       └── DashboardDataService.php
│
├── Repositories/                       # Data Access Abstraction
│   ├── Post/
│   │   ├── PostRepositoryInterface.php
│   │   └── PostRepository.php
│   └── Tag/
│       ├── TagRepositoryInterface.php
│       └── TagRepository.php
│
├── Data/                               # DTOs (Laravel Data)
│   ├── Post/
│   │   ├── CreatePostData.php
│   │   ├── UpdatePostData.php
│   │   └── SearchPostsData.php
│   └── Tag/
│       └── TagValueData.php
│
├── Models/                             # Eloquent Models
│   ├── Post.php
│   ├── Tag.php
│   └── User.php
│
├── Policies/                           # Authorization
│   ├── PostPolicy.php
│   └── TagPolicy.php
│
├── Enums/                              # Enum Types
│   └── PostStatus.php
│
├── Exceptions/                         # Custom Exceptions
│   └── Post/
│       └── PostNotFoundException.php
│
└── Utils/                              # Utilities
    └── ModelTransformer.php            # TypeScript generation
```

---

## Layer Dependencies

### Dependency Flow

```
┌─────────────────────────────────────────┐
│  Presentation (Controllers)             │ → Request, UseCase, Resource
├─────────────────────────────────────────┤
│  Request (Form Requests)                │ → Data (DTOs)
├─────────────────────────────────────────┤
│  UseCase (Business Logic)               │ → Repository, Service, Policy
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

### Allowed Dependencies

| Layer | Can Depend On |
|-------|---------------|
| **Presentation (Controllers)** | Request, UseCase, Resource |
| **Request (FormRequests)** | Data (DTOs), Enum |
| **UseCase** | Repository, Service, Policy, Data, Model, Enum |
| **Service** | Repository, Model, Enum |
| **Repository** | Model, Enum |
| **Model** | Enum only |
| **Resource** | Model, Enum |
| **Data (DTOs)** | Enum only |

### Prohibited Dependencies

| Layer | Cannot Depend On |
|-------|-----------------|
| **Model** | Repository, UseCase, Service |
| **UseCase** | Resource, Controller |
| **Controller** | Model directly (use UseCase + Repository) |
| **Repository** | UseCase, Controller |

---

## File Naming Conventions

### Controllers

| Type | Pattern | Example |
|------|---------|---------|
| API Controller | `[Resource]Controller.php` | `PostController.php` |
| Web Controller | `[Resource]PageController.php` | `PostPageController.php` |

### Form Requests

| Action | Pattern | Example |
|--------|---------|---------|
| Create | `Store[Resource]Request.php` | `StorePostRequest.php` |
| Update | `Update[Resource]Request.php` | `UpdatePostRequest.php` |
| Search | `Search[Resource]sRequest.php` | `SearchPostsRequest.php` |

### UseCases

| Action | Pattern | Example |
|--------|---------|---------|
| Create | `Create[Resource]UseCase.php` | `CreatePostUseCase.php` |
| Update | `Update[Resource]UseCase.php` | `UpdatePostUseCase.php` |
| Delete | `Delete[Resource]UseCase.php` | `DeletePostUseCase.php` |
| List | `Get[Resource]sUseCase.php` | `GetPostsUseCase.php` |
| Single | `Get[Resource]UseCase.php` | `GetPostUseCase.php` |

### Services

| Pattern | Example |
|---------|---------|
| `[Resource][Function]Service.php` | `PostExportService.php` |
| | `DashboardDataService.php` |

### Repositories

| Type | Pattern | Example |
|------|---------|---------|
| Interface | `[Resource]RepositoryInterface.php` | `PostRepositoryInterface.php` |
| Implementation | `[Resource]Repository.php` | `PostRepository.php` |

### DTOs (Laravel Data)

| Action | Pattern | Example |
|--------|---------|---------|
| Create input | `Create[Resource]Data.php` | `CreatePostData.php` |
| Update input | `Update[Resource]Data.php` | `UpdatePostData.php` |
| Search input | `Search[Resource]sData.php` | `SearchPostsData.php` |
| Nested | `[Property]Data.php` | `TagValueData.php` |

### Resources

| Pattern | Example |
|---------|---------|
| `[Resource]Resource.php` | `PostResource.php` |

### Policies

| Pattern | Example |
|---------|---------|
| `[Resource]Policy.php` | `PostPolicy.php` |

---

## Service Provider Bindings

Register Repository interface bindings in `AppServiceProvider`:

```php
// app/Providers/AppServiceProvider.php
namespace App\Providers;

use App\Repositories\Post\PostRepository;
use App\Repositories\Post\PostRepositoryInterface;
use App\Repositories\Tag\TagRepository;
use App\Repositories\Tag\TagRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Repository bindings
        $this->app->bind(PostRepositoryInterface::class, PostRepository::class);
        $this->app->bind(TagRepositoryInterface::class, TagRepository::class);
    }

    public function boot(): void
    {
        //
    }
}
```

---

## Example: Complete Feature Structure

### Post Feature Files

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Api/
│   │   │   └── PostController.php          # API endpoints
│   │   └── Web/
│   │       └── PostPageController.php      # Inertia pages
│   ├── Requests/
│   │   └── Post/
│   │       ├── StorePostRequest.php        # Create validation
│   │       ├── UpdatePostRequest.php       # Update validation
│   │       └── SearchPostsRequest.php      # Search validation
│   └── Resources/
│       └── PostResource.php                # JSON response
│
├── UseCases/
│   └── Post/
│       ├── CreatePostUseCase.php           # Create logic
│       ├── UpdatePostUseCase.php           # Update logic
│       ├── DeletePostUseCase.php           # Delete logic
│       └── GetPostsUseCase.php             # List logic
│
├── Services/
│   └── Post/
│       └── PostExportService.php           # CSV/PDF export
│
├── Repositories/
│   └── Post/
│       ├── PostRepositoryInterface.php     # Interface
│       └── PostRepository.php              # Implementation
│
├── Data/
│   └── Post/
│       ├── CreatePostData.php              # Create DTO
│       ├── UpdatePostData.php              # Update DTO
│       └── SearchPostsData.php             # Search DTO
│
├── Models/
│   └── Post.php                            # Eloquent Model
│
├── Policies/
│   └── PostPolicy.php                      # Authorization
│
├── Enums/
│   └── PostStatus.php                      # Status enum
│
└── Exceptions/
    └── Post/
        └── PostNotFoundException.php       # Domain exception
```

### Routes

```php
// routes/web.php (Inertia pages)
Route::middleware(['auth'])->group(function () {
    Route::get('/posts', [PostPageController::class, 'index'])
        ->name('posts.index');
    Route::get('/posts/create', [PostPageController::class, 'create'])
        ->name('posts.create');
    Route::get('/posts/{id}/edit', [PostPageController::class, 'edit'])
        ->name('posts.edit');
});

// routes/api.php (REST API)
Route::middleware(['auth:sanctum'])->group(function () {
    Route::apiResource('posts', PostController::class);
});
```

---

## Best Practices

### 1. Keep Layers Focused

Each layer should have a single responsibility:

- **Controller**: HTTP request/response handling only
- **FormRequest**: Validation only
- **UseCase**: Business logic only
- **Repository**: Data access only
- **Model**: Data structure only
- **Resource**: JSON transformation only

### 2. Use Dependency Injection

Inject dependencies through constructor:

```php
final readonly class CreatePostUseCase
{
    public function __construct(
        private PostRepositoryInterface $postRepository,
        private TagRepositoryInterface $tagRepository,
    ) {}
}
```

### 3. Interface for Repositories

Always use interface for Repository injection:

```php
// ✅ Correct - Interface injection
public function __construct(
    private PostRepositoryInterface $repository,
) {}

// ❌ Wrong - Concrete class injection
public function __construct(
    private PostRepository $repository,
) {}
```

### 4. Group by Feature

Organize files by feature (resource), not by type:

```
// ✅ Correct - Grouped by feature
Requests/Post/StorePostRequest.php
Requests/Post/UpdatePostRequest.php
UseCases/Post/CreatePostUseCase.php
UseCases/Post/UpdatePostUseCase.php

// ❌ Wrong - Flat structure
Requests/StorePostRequest.php
Requests/UpdatePostRequest.php
Requests/StoreTagRequest.php
UseCases/CreatePostUseCase.php
UseCases/UpdatePostUseCase.php
UseCases/CreateTagUseCase.php
```
