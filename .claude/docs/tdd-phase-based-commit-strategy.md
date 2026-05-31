# Phase単位のTDDコミット戦略

## コミット粒度の比較

### タスク単位（現状 - 非推奨）
- 28タスク × 平均2.5コミット = **約70コミット**
- 実装時間: **約60分**
- 問題点: コミット履歴が煩雑、レビューが困難

### Phase単位（推奨）
- 7 Phase × 3コミット (RED/GREEN/REFACTOR) = **21コミット**
- 実装時間: **約30-40分**
- 利点: 機能的なまとまり、レビューしやすい

## Phase単位のTDDサイクル

### 基本原則

各Phaseで以下の3ステップを実行：

1. **RED**: Phase内の全テストを作成 → コミット
2. **GREEN**: Phase内の全実装を完了 → コミット
3. **REFACTOR**: コード品質改善 → コミット

### 実装例: 認証機能

#### Phase 0: 環境準備
```bash
# 一括で環境セットアップ
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan session:table
php artisan migrate

git add .
git commit -m "chore(auth): 環境準備完了 - Sanctumインストール、セッションテーブル作成"
```

#### Phase 1: Model層
```bash
# RED: Model関連テスト作成
# - UserTest.php（アクセサ、リレーション）
git add tests/Unit/Models/
git commit -m "test(auth): Model層テスト作成 (RED)

- User Modelスコープテスト
- User Modelリレーションテスト"

# GREEN: Model実装
# - User.php（fillable, casts, relations）
git add app/Models/
git commit -m "feat(auth): Model層実装完了 (GREEN)

- User Model実装
- UserStatus Enum実装
- リレーション定義"

# REFACTOR: コード品質改善（Pint適用等）
./vendor/bin/pint app/Models/
git add app/Models/
git commit -m "refactor(auth): Model層リファクタリング (REFACTOR)

- Laravel Pint適用
- コーディング規約統一"
```

#### Phase 2: Repository層
```bash
# RED
git commit -m "test(auth): Repository層テスト作成 (RED)

- UserRepositoryテスト"

# GREEN
git commit -m "feat(auth): Repository層実装完了 (GREEN)

- UserRepositoryInterface定義
- UserRepository実装"

# REFACTOR
git commit -m "refactor(auth): Repository層リファクタリング (REFACTOR)"
```

#### Phase 3: UseCase層
```bash
# RED
git commit -m "test(auth): UseCase層テスト作成 (RED)

- LoginUseCaseテスト
- LogoutUseCaseテスト
- GetAuthenticatedUserUseCaseテスト"

# GREEN
git commit -m "feat(auth): UseCase層実装完了 (GREEN)

- LoginData DTO実装（Laravel Data）
- AuthenticatedUserData DTO実装
- LoginUseCase実装（セッション再生成含む）
- LogoutUseCase実装（セッション無効化含む）
- GetAuthenticatedUserUseCase実装"

# REFACTOR
git commit -m "refactor(auth): UseCase層リファクタリング (REFACTOR)"
```

#### Phase 4: Controller層
```bash
# RED
git commit -m "test(auth): Controller層テスト作成 (RED)

- LoginRequestテスト
- AuthControllerテスト"

# GREEN
git commit -m "feat(auth): Controller層実装完了 (GREEN)

- LoginRequest実装（バリデーション）
- AuthController実装（login/logout/user）
- APIルート定義
- レート制限設定"

# REFACTOR
git commit -m "refactor(auth): Controller層リファクタリング (REFACTOR)"
```

#### Phase 5: セキュリティ強化
```bash
git commit -m "feat(security): セキュリティ設定強化

- SecurityHeadersMiddleware実装
- パスワードポリシー設定（Argon2id）
- セッション設定強化
- CORS設定"
```

#### Phase 6: サービスプロバイダー登録
```bash
git commit -m "feat(auth): DI設定完了

- UserRepositoryInterfaceバインド"
```

#### Phase 7: ドキュメント作成
```bash
git commit -m "docs(auth): API仕様書・セットアップガイド作成"
```

#### Quality Checks
```bash
# Backend Quality Checks
./vendor/bin/phpstan analyse && ./vendor/bin/pint --test && ./vendor/bin/phpunit && ./vendor/bin/deptrac

git commit -m "chore(auth): Quality Checks通過

- PHPStan静的解析通過
- Laravel Pintコーディング規約チェック通過
- PHPUnitテスト実行成功
- Deptrac依存関係チェック通過"
```

## コミット数の削減効果

| Phase | タスク数 | タスク単位 | Phase単位 |
|-------|---------|-----------|-----------|
| Phase 0 | 4 | 4 | 1 |
| Phase 1 | 5 | 15 (5×3) | 3 |
| Phase 2 | 1 | 3 | 3 |
| Phase 3 | 6 | 18 (6×3) | 3 |
| Phase 4 | 4 | 12 (4×3) | 3 |
| Phase 5 | 5 | 5 | 1 |
| Phase 6 | 1 | 1 | 1 |
| Phase 7 | 2 | 2 | 1 |
| Quality | - | 1 | 1 |
| **合計** | **28** | **61** | **17** |

**削減率: 72%**

## 時間短縮効果

### タスク単位の実行時間
- タスク準備: 2分/タスク × 28 = 56分
- 実装: 平均3分/タスク × 28 = 84分
- コミット: 1分/タスク × 61 = 61分
- **合計: 約3時間20分**

### Phase単位の実行時間
- Phase準備: 5分/Phase × 7 = 35分
- 実装（一括）: 平均10分/Phase × 7 = 70分
- コミット: 1分/コミット × 17 = 17分
- **合計: 約2時間**

**削減効果: 約40%の時間短縮**

## 適用方法

### コマンドファイルの修正

`.claude/commands/spec-interview-strict-tdd.md` と `.claude/commands/spec-interview-auto-strict-tdd.md` を更新：

**変更前:**
```markdown
## 実装ステップ（機能単位で記載）
1. [機能1: 具体的な機能名]
2. [機能2: 具体的な機能名]
```

**変更後:**
```markdown
## 実装ステップ（Phase単位で記載）

### Phase 1: Model層
- User Model（fillable, casts, relations）
- UserStatus Enum

### Phase 2: Repository層
- UserRepositoryInterface
- UserRepository実装

### Phase 3: UseCase層
- LoginUseCase, LogoutUseCase, GetAuthenticatedUserUseCase
- Laravel Data DTOs

### Phase 4: Controller層
- LoginRequest
- AuthController
- APIルート定義

### Phase 5: セキュリティ強化
- SecurityHeadersMiddleware
- パスワードポリシー設定

### Phase 6: DI設定
- Repository binding

### Phase 7: ドキュメント
- API仕様書
- セットアップガイド
```

## 注意事項

### Phase内でのテスト駆動開発

Phase内では引き続きTDDを実践：

1. **テストファイルを先に作成**（RED）
2. **最小限の実装**（GREEN）
3. **リファクタリング**（REFACTOR）

ただし、コミットはPhaseの各ステップ完了時のみ。

### エラー発生時の対応

Phase単位で実装中にエラーが発生した場合：

1. **問題を特定**
2. **該当部分を修正**
3. **REFACTORステップでコミット**

途中でコミットしないことで、履歴が煩雑になるのを防ぐ。

### レビューのしやすさ

Phase単位のコミットは以下の利点がある：

- **機能的なまとまり**: UseCase層全体を一度にレビュー可能
- **差分の可読性**: 関連するファイルがまとまっている
- **ロールバックの容易性**: Phase単位で戻せる

## まとめ

- **コミット数**: 61 → 17（72%削減）
- **実装時間**: 3時間20分 → 2時間（40%削減）
- **レビュー効率**: Phase単位で機能的なまとまり
- **Git履歴の可読性**: 向上

Phase単位のTDDコミット戦略を採用することで、開発効率とコード品質の両立が可能。
