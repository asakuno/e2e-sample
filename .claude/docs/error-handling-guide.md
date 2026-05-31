# エラーハンドリングガイド

## エラー発生時の対応フロー

### Phase実装中のエラー

#### 1. 即座に修正可能な場合
修正して同じPhase内で進める。

**例**:
- タイポや簡単な構文エラー
- import文の不足
- 軽微な型エラー

**対応**:
```bash
# エラーを修正後、同じPhaseの作業を続行
# コミットは通常のPhaseのタイミングで実施
```

#### 2. 設計変更が必要な場合
REFACTORステップで対応する。

**例**:
- コンポーネント構造の見直し
- 関数の分割・統合
- パフォーマンス改善

**対応**:
```bash
# GREEN（実装）を完了させる
git commit -m "feat: Phase X 実装完了 (GREEN)"

# REFACTORで設計変更を実施
# 修正後
git commit -m "refactor: Phase X リファクタリング (REFACTOR)"
```

#### 3. 前Phaseの修正が必要な場合
前Phaseに戻り、修正コミットを作成する。

**例**:
- UseCase層のビジネスロジック設計ミス（Controller実装中に発見）
- DTOのバリデーションロジックの不備
- Repository Interfaceのメソッド不足

**対応**:
```bash
# 現在のPhaseの作業を一時中断（未コミットの場合はstash）
git stash

# 前Phaseのファイルを修正
# 修正後、fix コミットを作成
git add .
git commit -m "fix(backend): Phase X修正 - [修正内容]

前Phase実装中に発見した問題を修正

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 中断していた作業を再開
git stash pop

# 現在のPhaseの作業を続行
```

---

## Quality Checksでのエラー対応

### 基本フロー

1. **エラーメッセージを分析**
2. **該当箇所を特定・修正**
3. **再度Quality Checksを実行**
4. **すべてパス後、修正コミットを作成**

### Frontend Quality Checks

```bash
yarn typecheck && yarn check && yarn test && yarn build
```

#### よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|--------|------|--------|
| **typecheck失敗** | 型定義の不足 | 適切な型を追加 |
| **check失敗** | Biome lint エラー | `yarn check --apply` で自動修正 |
| **test失敗** | テストケースの不足または実装のバグ | 修正して再実行 |
| **build失敗** | import エラーやビルド設定の問題 | エラーログを確認して修正 |

#### 対応例

```bash
# typecheck エラーの場合
# 型定義を追加・修正
# 再度チェック
yarn typecheck

# check エラーの場合（自動修正を試す）
yarn check --apply
yarn check  # 再確認

# test エラーの場合
# テストまたは実装を修正
yarn test

# すべてパス後、修正コミット
git add .
git commit -m "fix(frontend): Quality Checks修正 - [修正内容]

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Backend Quality Checks

```bash
./vendor/bin/phpstan analyse && ./vendor/bin/pint --test && ./vendor/bin/phpunit && ./vendor/bin/deptrac
```

#### よくあるエラーと対処法

| エラー | 原因 | 対処法 |
|--------|------|--------|
| **phpstan失敗** | 型定義の不足、潜在的バグ | 適切な型を追加、コードを修正 |
| **pint失敗** | コーディング規約違反 | `./vendor/bin/pint` で自動修正 |
| **phpunit失敗** | テストケースの不足または実装のバグ | 修正して再実行 |
| **deptrac失敗** | 依存関係の違反 | 7層アーキテクチャに従って修正 |

#### 対応例

```bash
# phpstan エラーの場合
# 型定義を追加・修正
# 再度チェック
./vendor/bin/phpstan analyse

# pint エラーの場合（自動修正を試す）
./vendor/bin/pint
./vendor/bin/pint --test  # 再確認

# phpunit エラーの場合
# テストまたは実装を修正
./vendor/bin/phpunit

# deptrac エラーの場合
# 依存関係を修正（例: レイヤー間の不正な依存を修正）
./vendor/bin/deptrac

# すべてパス後、修正コミット
git add .
git commit -m "fix(backend): Quality Checks修正 - [修正内容]

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## エラー対応の原則

### 1. 早期発見・早期対処
- こまめにテストを実行する
- Quality Checksは各Phase完了直後に実行する
- エラーを放置して次に進まない

### 2. 段階的な対応
- 一度に複数のエラーを修正しようとしない
- 1つのエラーを修正 → チェック実行 → 次のエラーへ

### 3. ドキュメント参照
- エラー内容が不明な場合はプロジェクトのガイドラインを確認
  - Frontend: `Skill('coding-guidelines')`, `Skill('test-guidelines')`
  - Backend: `Skill('backend-coding-guidelines')`, `Skill('backend-test-guidelines')`

### 4. コミットメッセージの明確化
- 何を修正したのか明確に記載
- Quality Checks修正の場合は `fix:` プレフィックスを使用

---

## トラブルシューティング

### すべてのQuality Checksが失敗する場合

1. **依存関係を確認**
   ```bash
   # Frontend
   yarn install

   # Backend
   composer install
   ```

2. **設定ファイルを確認**
   - `tsconfig.json`, `biome.json`, `vite.config.ts` (Frontend)
   - `phpstan.neon`, `pint.json`, `deptrac.yaml` (Backend)

3. **キャッシュをクリア**
   ```bash
   # Frontend
   rm -rf node_modules/.cache
   yarn build

   # Backend
   php artisan cache:clear
   php artisan config:clear
   ```

### 特定のファイルでのみエラーが発生する場合

1. **ファイルパスを確認**
   - 命名規則に従っているか
   - 適切なディレクトリに配置されているか

2. **import/use文を確認**
   - 正しいパスを指定しているか
   - エイリアスが正しく設定されているか

3. **型定義を確認**
   - インターフェースやクラスの定義が正しいか
   - プロパティ名やメソッド名が一致しているか

---

## エラーログの読み方

### PHPStan エラー出力例

```
------ -----------------------------------------------------------------
Line   app/UseCases/User/CreateUserUseCase.php
------ -----------------------------------------------------------------
 12     Parameter #1 $email of method UserRepositoryInterface::findByEmail()
        expects string, int given.
 24     Property CreateUserData::$tagValues type has no value type specified
        in iterable type array.
------ -----------------------------------------------------------------
```

**読み方**:
- `Line 12`: エラーが発生した行番号
- `Parameter #1 $email expects string, int given`: 型の不一致（string期待、intが渡された）
- **対処法**: メソッド呼び出し側で正しい型を渡す、またはメソッドのシグネチャを修正

### Biome エラー出力例

```
error[lint/suspicious/noExplicitAny]: Do not use the any type.
   ┌─ src/Components/Button.tsx:5:12
   │
 5 │   onClick: any;
   │            ^^^
   │
   = Unsafe fix: Use unknown instead.
```

**読み方**:
- `lint/suspicious/noExplicitAny`: ルール名
- `5:12`: ファイルの5行目、12文字目
- `any`: 問題のある型
- **対処法**: `any` を `unknown` または適切な型に変更

### PHPUnit エラー出力例

```
1) Tests\Unit\UseCases\User\CreateUserUseCaseTest::test_重複メールアドレスは例外が発生する
Failed asserting that exception of type "ValidationException" is thrown.

/home/user/project/tests/Unit/UseCases/User/CreateUserUseCaseTest.php:28
```

**読み方**:
- `1)`: テストケース番号
- `CreateUserUseCaseTest::test_重複メールアドレスは例外が発生する`: 失敗したテスト
- `Failed asserting that exception of type "ValidationException" is thrown`: 期待した例外が発生しなかった
- **対処法**: 実装側で例外を投げるロジックを追加、またはテストの期待値を修正

---

## ロールバック戦略

### コミット前のロールバック

#### 作業ディレクトリの変更を破棄

```bash
# すべての変更を破棄
git restore .

# 特定のファイルのみ破棄
git restore path/to/file.php
```

#### ステージングエリアから取り消し

```bash
# すべてのステージングを取り消し（ファイルは保持）
git restore --staged .

# 特定のファイルのみ取り消し
git restore --staged path/to/file.php
```

### コミット後のロールバック

#### git revert（推奨：履歴を残す）

```bash
# 直前のコミットを取り消す新しいコミットを作成
git revert HEAD

# 特定のコミットを取り消す
git revert <commit-hash>

# 複数のコミットを取り消す
git revert HEAD~3..HEAD
```

**メリット**:
- コミット履歴が保持される
- チームメンバーと履歴を共有できる
- 本番環境にプッシュ済みでも安全

**デメリット**:
- 履歴が冗長になる

#### git reset（注意：履歴を削除）

```bash
# 直前のコミットを取り消し（変更は保持）
git reset --soft HEAD~1

# 直前のコミットを取り消し（ステージングも取り消し）
git reset HEAD~1

# 直前のコミットを完全に削除（変更も破棄）
git reset --hard HEAD~1
```

**メリット**:
- 履歴がクリーンに保たれる
- ローカルでの作業のやり直しに便利

**デメリット**:
- プッシュ済みの場合は使用不可（force pushが必要）
- チーム開発では避けるべき

### プッシュ後のロールバック

#### リモートにプッシュ済みの場合

```bash
# git revert を使用（推奨）
git revert HEAD
git push origin <branch-name>

# git reset + force push（非推奨：チーム開発では避ける）
git reset --hard HEAD~1
git push --force origin <branch-name>
```

**重要**: `main` / `master` ブランチへの force push は**絶対に禁止**。

### Phase実装中の問題対応

#### Phase 2でPhase 1の問題を発見した場合

```bash
# 現在の作業を一時保存
git stash

# Phase 1のファイルを修正
# 修正後、Phase 1の修正コミット
git add app/UseCases/
git commit -m "fix(backend): Phase 1修正 - UseCase設計の不備を修正

Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 作業を復元
git stash pop

# Phase 2の作業を継続
```

---

## トラブルシューティング FAQ

### よくあるエラーと解決策

| エラー内容 | 原因 | 解決策 |
|----------|------|--------|
| **Module not found** (Frontend) | import パスの誤り | パスエイリアス（`@/`）を確認、相対パスを修正 |
| **Class not found** (Backend) | namespace または use 文の誤り | `composer dump-autoload` を実行、namespace を確認 |
| **Property does not exist** | 型定義の不一致 | interface/type 定義を確認、プロパティ名を修正 |
| **Undefined variable** | 変数のスコープ誤り | 変数の定義位置を確認、パラメータとして渡す |
| **Test timeout** | 非同期処理の await 忘れ | `async/await` を追加、`waitFor` を使用 |
| **Database connection failed** | .env 設定誤り | `.env` のDB設定を確認、`php artisan migrate` を実行 |
| **Memory limit exceeded** | テストで大量データ生成 | Factory の生成数を削減、`RefreshDatabase` を使用 |
| **Circular dependency** | ドメイン間の循環参照 | Service層パターンで依存を逆転、アーキテクチャを見直す |

### 緊急時の対応フロー

1. **エラーの特定**: エラーメッセージをよく読み、発生箇所を特定
2. **ログの確認**: ブラウザコンソール、Laravelログ（`storage/logs/laravel.log`）
3. **ガイドライン参照**: プロジェクトの規約を確認
4. **ロールバック検討**: 修正が困難な場合は `git revert` でロールバック
5. **Issue作成**: 複雑な問題は Issue を作成して記録
