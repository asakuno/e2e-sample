# バックエンド アーキテクチャ概要

## 基本方針

本プロジェクトは**7層のレイヤード・アーキテクチャ**を採用する。

### 設計原則

- SOLID原則の遵守
- 型安全性の重視（PHPDoc、Type Hints、DTOs、TypeScript自動生成）
- テスト駆動開発（TDD）の推奨

---

## 7層アーキテクチャ

```
┌─────────────────────────────────────────┐
│  Presentation Layer (Controllers)       │  ← HTTP Request/Response
├─────────────────────────────────────────┤
│  Request Layer (Form Requests)          │  ← Validation & DTO Conversion
├─────────────────────────────────────────┤
│  Use Case Layer (Business Logic)        │  ← Application Logic
├─────────────────────────────────────────┤
│  Service Layer (Shared Logic)           │  ← Reusable Business Logic
├─────────────────────────────────────────┤
│  Repository Layer (Data Access)         │  ← Data Abstraction
├─────────────────────────────────────────┤
│  Model Layer (Eloquent Models)          │  ← Domain Models
├─────────────────────────────────────────┤
│  Resource Layer (Response Transformation) │  ← JSON Serialization
└─────────────────────────────────────────┘
```

### 各層の責務

| レイヤー | 責務 | 依存方向 |
|---------|------|---------|
| **Presentation** | HTTPリクエスト受付・レスポンス返却 | → Request, UseCase, Resource |
| **Request** | バリデーション、DTO変換 | → DTO |
| **Use Case** | ビジネスロジック、トランザクション制御 | → Repository, Service, Policy |
| **Service** | 汎用的なビジネスロジック | → Repository, Model |
| **Repository** | データアクセス抽象化 | → Model |
| **Model** | ドメインモデル、データ永続化 | なし（最下層） |
| **Resource** | JSONレスポンス変換 | → Model |

---

## 依存ルール

- **下位層から上位層への依存は禁止**
- **Controller が Model に直接アクセス禁止**（Repository 経由必須）
- **Interface を介した依存性逆転**（Repository など）

---

## 命名規則

| 種類 | 命名規則 | 例 |
|------|---------|-----|
| Web Controller | `[Resource]PageController` | `PostPageController` |
| API Controller | `[Resource]Controller` | `PostController` |
| Form Request | `Store/Update[Resource]Request` | `StorePostRequest` |
| Use Case | `[Action][Resource]UseCase` | `CreatePostUseCase` |
| Repository | `[Resource]RepositoryInterface` | `PostRepositoryInterface` |
| DTO | `Create/Update[Resource]Data` | `CreatePostData` |

---

## 禁止事項

- **型宣言の省略**（public メソッドに型宣言必須）
- **Controller でのビジネスロジック実装**
- **Controller での直接的なDB アクセス**
- **Eloquent Model を上位層に直接返す**

---

## 詳細ガイドライン（Skills 参照）

実装時は以下の Skills を参照すること。

| 領域 | Skill |
|------|-------|
| レイヤー実装詳細 | `Skill('backend-coding-guidelines')` |
| UseCase/Repository パターン | `Skill('backend-coding-guidelines')` |
| DTO（Laravel Data） | `Skill('backend-coding-guidelines')` |
| TypeScript 型生成 | `Skill('backend-architecture-guidelines')` |
| テスト戦略 | `Skill('backend-test-guidelines')` |
| Inertia.js バックエンド | `Skill('backend-coding-guidelines')` |
