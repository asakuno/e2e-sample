# Backend Plan Review Results - ログイン機能

**Review Date:** 2026-01-30
**Reviewer:** Backend Plan Reviewer Agent
**Task:** Laravel Sanctum Cookie認証によるログイン機能実装

---

## Status
✅ **Approved** - 実装計画は承認されました

---

## Architecture Compliance

### Layer Placement: ✅ PASS

| レイヤー | 実装内容 | 評価 |
|---------|---------|------|
| **Model層** | User Model（既存確認） | ✅ 正しい |
| **DTO層** | LoginData, AuthenticatedUserData | ✅ 正しい |
| **UseCase層** | LoginUseCase, LogoutUseCase, GetAuthenticatedUserUseCase | ✅ 正しい |
| **Request層** | LoginRequest（バリデーション + DTO変換） | ✅ 正しい |
| **Presentation層** | AuthController（API） | ✅ 正しい |
| **Repository層** | 使用しない（Laravel標準Auth使用） | ✅ 正しい判断 |
| **Service層** | 使用しない | ✅ 正しい判断 |
| **Resource層** | 使用しない（DTO直接返却） | ✅ 正しい判断 |

**詳細:**
- ✅ 各層の責務が明確に分離されている
- ✅ 依存方向が上位→下位の一方向（Controller → UseCase → Model）
- ✅ Repository不使用の判断は適切（Laravel標準`Auth::attempt()`使用、シンプルなCRUD）

---

### UseCase Structure: ✅ PASS

| チェック項目 | 評価 |
|------------|------|
| Input DTO (Laravel Data) を受け取る | ✅ LoginData使用 |
| Eloquent Model を返す | ✅ User Model返却 |
| HTTP依存がない | ✅ HTTP依存なし |
| `final` class | ✅ 正しい |
| ドメインバリデーション配置 | ✅ UseCase内で実装（メール・パスワード検証） |

**詳細:**
- ✅ **LoginUseCase**: Laravel標準`Auth::attempt()`使用、セッション再生成実装
- ✅ **LogoutUseCase**: セッション無効化、CSRFトークン再生成実装
- ✅ **GetAuthenticatedUserUseCase**: AuthenticationException使用（改善済み）

---

### Repository Pattern: ✅ PASS (Not Required)

**判断**: Repository を**作成しない**

**理由:**
- Laravel標準の`Auth::attempt()`を使用（シンプルな認証ロジック）
- 複雑なクエリロジックが不要
- 単一モデル操作のみ

**Decision Framework準拠:**
> "Repository を作成しなくても良いケース: シンプルな CRUD、単一モデル操作"

✅ **正しい判断** - 認証機能には複雑なクエリが不要であり、Laravel標準機能で十分

---

### DTO Design: ✅ PASS

| DTO | チェック項目 | 評価 |
|-----|------------|------|
| **LoginData** | `spatie/laravel-data` 使用 | ✅ |
|  | `#[TypeScript()]` attribute | ✅ |
|  | `readonly` property | ✅ |
|  | `#[MapName(SnakeCaseMapper::class)]` | ✅ |
| **AuthenticatedUserData** | `spatie/laravel-data` 使用 | ✅ |
|  | `#[TypeScript()]` attribute | ✅ |
|  | `readonly` property | ✅ |
|  | `fromModel()` メソッド | ✅ |

**詳細:**
- ✅ 両DTOともLaravel Dataパターンに完全準拠
- ✅ TypeScript型生成が有効化されている
- ✅ イミュータブル設計（readonly）

---

### Controller Design: ✅ PASS

| チェック項目 | 評価 |
|------------|------|
| HTTP handling のみ | ✅ 正しい |
| UseCase を呼び出す | ✅ 正しい |
| ビジネスロジックなし | ✅ 正しい |
| API Controller（動的データ） | ✅ 正しい |
| `class` (NOT `final`) | ✅ 正しい（テスト用） |

**詳細:**
- ✅ **AuthController**: HTTP Request/Response処理のみ
- ✅ ビジネスロジックはUseCaseに委譲
- ✅ API Controller命名規則に準拠（`{Resource}Controller`）

---

### FormRequest Design: ✅ PASS

| チェック項目 | 評価 |
|------------|------|
| バリデーションルール定義 | ✅ 正しい |
| カスタムエラーメッセージ | ✅ 正しい |
| DTO変換メソッド (`getLoginData()`) | ✅ 正しい |
| `authorize()` メソッド | ✅ 正しい（全ユーザー許可） |

---

### Dependency Direction: ✅ PASS

```
Presentation (AuthController)
    ↓
Request (LoginRequest)
    ↓
UseCase (LoginUseCase)
    ↓
Model (User via Auth facade)
```

- ✅ 依存方向は上位→下位の一方向のみ
- ✅ 下位層から上位層への依存なし
- ✅ レイヤー境界が明確

---

## Security Compliance: ✅ PASS

### セキュリティ対策チェックリスト

| 対策項目 | 実装 | 評価 |
|---------|------|------|
| パスワードハッシュ化検証 | Laravel標準`Auth::attempt()` | ✅ |
| セッション再生成（ログイン時） | `request()->session()->regenerate()` | ✅ |
| セッション無効化（ログアウト時） | `request()->session()->invalidate()` | ✅ |
| CSRFトークン再生成 | `request()->session()->regenerateToken()` | ✅ |
| CSRF保護 | Sanctum標準機能 | ✅ |
| レート制限 | 60リクエスト/分 | ✅ |
| セッション設定 | http_only=true, same_site=lax | ✅ |
| 本番環境HTTPS | secure=true設定予定 | ✅ |

**詳細:**
- ✅ **セッションフィクス化攻撃対策**: ログイン時のセッション再生成実装
- ✅ **CSRF攻撃対策**: Sanctum標準機能使用
- ✅ **ブルートフォース攻撃対策**: レート制限実装
- ✅ **セッションハイジャック対策**: http_only, secure, same_site設定

---

## Test Coverage Plan: ✅ PASS

### ユニットテスト

| テスト対象 | テストファイル | カバレッジ目標 |
|-----------|--------------|--------------|
| LoginData | `tests/Unit/Data/Auth/LoginDataTest.php` | 100% |
| AuthenticatedUserData | `tests/Unit/Data/Auth/AuthenticatedUserDataTest.php` | 100% |
| LoginUseCase | `tests/Unit/UseCases/Auth/LoginUseCaseTest.php` | 80%以上 |
| LogoutUseCase | `tests/Unit/UseCases/Auth/LogoutUseCaseTest.php` | 80%以上 |
| GetAuthenticatedUserUseCase | `tests/Unit/UseCases/Auth/GetAuthenticatedUserUseCaseTest.php` | 80%以上 |

### フィーチャーテスト

| テスト対象 | テストファイル | カバレッジ目標 |
|-----------|--------------|--------------|
| LoginRequest | `tests/Feature/Http/Requests/Auth/LoginRequestTest.php` | 70%以上 |
| AuthController | `tests/Feature/Http/Controllers/Api/AuthControllerTest.php` | 70%以上 |

**テストシナリオ:**
- ✅ 正常系: ログイン成功、ログアウト成功、ユーザー情報取得成功
- ✅ 異常系: バリデーションエラー、認証失敗、未認証エラー
- ✅ セキュリティ: セッション再生成、CSRFトークン再生成

---

## Documentation Plan: ✅ PASS

| ドキュメント | ファイルパス | 内容 |
|------------|-----------|------|
| API仕様書 | `.claude/specs/api-spec-auth.md` | エンドポイント、リクエスト/レスポンス例 |
| セットアップガイド | `.claude/specs/setup-guide-auth.md` | Sanctum設定、環境変数、マイグレーション |

---

## Improvements Applied

### 1. GetAuthenticatedUserUseCase - Exception Class
**Before:**
```php
throw new \Exception('Unauthenticated.');
```

**After:**
```php
throw new \Illuminate\Auth\AuthenticationException('Unauthenticated.');
```

**理由**: Laravel標準の認証例外クラスを使用し、一貫性を保つ

---

### 2. routes/api.php - Sanctum CSRF Endpoint
**Before:**
```php
Route::get('/sanctum/csrf-cookie', function () {
    return response()->json(['message' => 'CSRF cookie set.']);
});
```

**After:**
```php
// 削除（Sanctumが自動登録）
```

**理由**: Sanctumが自動的に`/sanctum/csrf-cookie`エンドポイントを登録するため、手動定義は不要

---

## AI Weakness Checklist: ✅ ALL PASS

### UseCase ⚠️ (Most Critical)
- ✅ Controller は UseCase を呼び出すのみ（ビジネスロジックなし）
- ✅ UseCase は Input DTO (Laravel Data) を受け取る
- ✅ UseCase は Laravel標準Auth使用（Repository不要）
- ✅ UseCase は `final` class
- ✅ ドメインバリデーションは UseCase 内

### Repository ⚠️
- ✅ 今回は不要（Laravel標準Auth使用）
- ✅ 将来的な拡張時にInterface/Implementation分離を検討

### DTO ⚠️
- ✅ `spatie/laravel-data` を使用
- ✅ `#[TypeScript()]` attribute が付与されている
- ✅ `readonly` property を使用
- ✅ FormRequest に DTO 変換メソッドがある

### Layer Separation ⚠️
- ✅ Controller は HTTP handling のみ
- ✅ UseCase はビジネスロジックのみ
- ✅ FormRequest はバリデーションとDTO変換のみ
- ✅ 下位層から上位層への依存がない

### Web vs API ⚠️
- ✅ API Controller のみ使用（動的データ処理）
- ✅ Web Controller は今回不要

---

## Phase-by-Phase Implementation Plan: ✅ PASS

計画書は以下のPhaseに正しく分割されています：

| Phase | 内容 | 評価 |
|-------|------|------|
| **Phase 0** | 環境準備（Sanctumインストール、CORS設定） | ✅ |
| **Phase 1** | DTO層（LoginData, AuthenticatedUserData） | ✅ |
| **Phase 2** | UseCase層（LoginUseCase, LogoutUseCase, GetAuthenticatedUserUseCase） | ✅ |
| **Phase 3** | Request層（LoginRequest） | ✅ |
| **Phase 4** | Presentation層（AuthController, APIルート） | ✅ |
| **Phase 5** | テスト実装（Unit/Feature） | ✅ |
| **Phase 6** | ドキュメント作成（API仕様書、セットアップガイド） | ✅ |

---

## Quality Checks: ✅ Planned

```bash
# 1. PHPStan静的解析
docker compose exec app ./vendor/bin/phpstan analyse

# 2. Laravel Pint コーディング規約チェック
docker compose exec app ./vendor/bin/pint --test

# 3. PHPUnit テスト実行
docker compose exec app ./vendor/bin/phpunit --coverage-text

# 4. Deptrac 依存関係チェック
docker compose exec app ./vendor/bin/deptrac
```

**合格基準:**
- PHPStan: エラー0件
- Pint: エラー0件
- PHPUnit: 全テストパス、カバレッジ70%以上
- Deptrac: 依存関係違反0件

---

## Action Items

### ✅ No Critical Issues

計画は承認されました。以下の手順で実装に進んでください。

### Next Steps

1. **Phase 0: 環境準備**
   - Laravel Sanctumインストール
   - API routes有効化
   - CORS設定作成

2. **Phase 1 以降: 順次実装**
   - 各Phaseごとに RED → GREEN → REFACTOR サイクルを実行
   - 各Phase完了後に該当テストを実行
   - 全Phase完了後にQuality Checksを実行

3. **Phase 2 実装時の参照**
   - `Skill('backend-coding-guidelines')` - UseCase構造、命名規則
   - `.claude/rules/backend/` - レイヤー詳細規約

---

## Summary

### 強み
- ✅ 7層アーキテクチャに完全準拠
- ✅ レイヤー分離が明確
- ✅ DTO設計がベストプラクティスに準拠
- ✅ セキュリティ対策が包括的
- ✅ テストカバレッジ計画が適切

### 改善済み
- ✅ GetAuthenticatedUserUseCaseの例外クラス改善
- ✅ routes/api.phpの不要なエンドポイント削除

### 承認理由
1. **アーキテクチャ遵守**: 7層アーキテクチャの全ルールに準拠
2. **セキュリティ**: IPA準拠の対策が包括的に実装予定
3. **テスト計画**: カバレッジ目標が明確
4. **Phase分割**: 実装順序が論理的

---

## Conclusion

✅ **実装計画は承認されました。Phase 0（環境準備）から実装を開始してください。**

**実装時の注意事項:**
- 各Phaseごとにテストを作成し、パスすることを確認
- UseCase構造は`backend-coding-guidelines`を参照
- Quality Checks は全Phase完了後に実行
- 不明点がある場合は`Skill('backend-coding-guidelines')`を参照

---

**Reviewed by:** Backend Plan Reviewer Agent
**Status:** ✅ Approved for Implementation
**Next Phase:** Phase 0 - 環境準備
