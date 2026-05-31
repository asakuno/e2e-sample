# Development Guide

あなたはプロジェクトのプロフェッショナルなフルスタックエンジニアです。

## プロジェクト概要

| 領域 | 技術 |
|------|------|
| バックエンド | Laravel 12.x (PHP 8.4+), Inertia.js |
| フロントエンド | React/TypeScript, Tailwind CSS, shadcn/ui |
| フォーム | Laravel Precognition（リアルタイムバリデーション） |
| テスト | PHPUnit (Backend), Vitest + RTL (Frontend), Storybook |
| ビルド | Composer (Backend), Vite (Frontend) |
| Lint/Format | Laravel Pint (Backend), Biome (Frontend) |
| 静的解析 | PHPStan, deptrac（依存関係） |

## アーキテクチャ

### バックエンド: 7層レイヤードアーキテクチャ
```
Presentation (Controllers) → Request (FormRequest) → UseCase → Service/Repository → Model → Resource
```
詳細: `.claude/rules/backend/` または `.claude/docs/architecture.md`

### フロントエンド: ハイブリッドアーキテクチャ
- **静的データ**: Inertia Props（認証情報、メニュー、権限、SEO コンテンツ）
- **動的データ**: API + カスタムフック（通知、統計、検索結果）
- **フォーム**: Laravel Precognition（`@inertiajs/react` の `useForm` は**使用禁止**）

詳細: `Skill('coding-guidelines')`

## 開発ワークフロー

すべてのタスクは以下の 6 フェーズに従う。**フェーズのスキップは禁止**。

| Phase | 内容 | Agent |
|-------|------|-------|
| 1. Planning & Review | 調査、計画作成、レビュー | `plan-reviewer` / `backend-plan-reviewer` |
| 2. Implementation & Review | 実装、コードレビュー | `implement-review` / `backend-implement-review` |
| 3. Quality Checks | 型チェック、lint、テスト、ビルド | - |
| 4. Browser Verification | UI/パフォーマンス確認（任意） | Chrome DevTools MCP |
| 5. Git Commit | `<type>: <description>` 形式 | - |
| 6. Push | `git push`, 必要に応じて PR 作成 | - |

### Quality Checks コマンド

**フロントエンド**:
```bash
yarn typecheck && yarn check && yarn test && yarn build
```

**バックエンド**:
```bash
./vendor/bin/phpstan analyse && ./vendor/bin/pint --test && ./vendor/bin/phpunit && ./vendor/bin/deptrac
```

### テストカバレッジ基準

コードカバレッジの最低基準を設定し、品質を担保する。

**バックエンド**:
- **UseCase 層**: 80%以上（ビジネスロジックの核心）
- **Repository 層**: 70%以上（データアクセス）
- **Controller 層**: 70%以上（API/Web）
- **Service 層**: 70%以上（共通ロジック）

```bash
./vendor/bin/phpunit --coverage-text
```

**フロントエンド**:
- **UI コンポーネント**: 70%以上
- **カスタムフック**: 80%以上
- **ユーティリティ関数**: 80%以上

```bash
yarn test --coverage
```

**重要**: カバレッジ基準を満たさない場合は、追加テストを作成してから次のフェーズに進む。

### バグ修正時のワークフロー統合

バグ修正は通常の開発ワークフローに統合されます（詳細は`bug-fixing`スキルを参照）:

| Bug Fix Step | Project Phase | 対応内容 |
|--------------|---------------|---------|
| 1-5 (調査・計画) | Phase 1: Planning & Review | バグ再現、根本原因特定、修正計画作成 |
| 6-7 (実装・テスト) | Phase 2: Implementation & Review | 修正実装、テストケース追加、コードレビュー |
| 8 (検証) | Phase 3: Quality Checks | 全チェック実行、カバレッジ確認 |
| 9 (ドキュメント) | Phase 5: Git Commit | コミットメッセージに根本原因記載 |
| 10 (監視) | Phase 6後: Post-deployment | 本番環境での動作確認 |

**スキル呼び出し**: バグ報告、エラー発生時は `Skill('bug-fixing')` を使用

## ディレクトリ構成

```
project/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/              # API Controllers（REST API）
│   │   │   └── Web/              # Web Controllers（Inertia.js用）
│   │   ├── Requests/             # FormRequests（バリデーション）
│   │   └── Resources/            # API Resources（JSONレスポンス）
│   ├── UseCases/                 # UseCases（ビジネスロジック）
│   ├── Services/                 # Services（共通ロジック）
│   ├── Repositories/             # Repositories（データアクセス）
│   ├── Data/                     # DTOs（Laravel Data）
│   ├── Models/                   # Eloquent Models
│   ├── Policies/                 # Policies（認可）
│   └── Enums/                    # Enums（列挙型）
├── resources/js/
│   ├── pages/                    # Inertia Pages（Reactコンポーネント）
│   ├── components/               # 共通コンポーネント
│   ├── layouts/                  # レイアウト
│   ├── hooks/                    # カスタムフック（API データ取得）
│   ├── types/                    # TypeScript型定義
│   │   ├── generated.d.ts        # 自動生成（Laravel Data）
│   │   └── model.d.ts            # 自動生成（modeltyper）
│   ├── actions/                  # Wayfinder Actions（自動生成）
│   └── routes/                   # Wayfinder Routes（自動生成）
├── routes/
│   ├── web.php                   # Inertia routes
│   └── api.php                   # API routes
└── tests/
    ├── Unit/                     # ユニットテスト
    └── Feature/                  # フィーチャーテスト
```

## 利用可能なツール

### Agents（タスク実行）

| Agent | 用途 |
|-------|------|
| `plan-reviewer` | Frontend Phase 1: 調査、UI/UX レビュー、計画作成 |
| `implement-review` | Frontend Phase 2: 実装、コードレビュー |
| `test-review` | Frontend テスト・Storybook 作成（任意） |
| `backend-plan-reviewer` | Backend Phase 1: 調査、アーキテクチャレビュー、計画作成 |
| `backend-implement-review` | Backend Phase 2: UseCase/Repository 実装、レビュー |
| `backend-test-review` | Backend PHPUnit テスト作成（任意） |

### Skills（知識参照）

| Skill | 内容 |
|-------|------|
| `coding-guidelines` | React/TS 規約、Precognition パターン、ハイブリッドアーキテクチャ |
| `test-guidelines` | Vitest/RTL テスト規約、AAA パターン |
| `storybook-guidelines` | Storybook ストーリー作成規約 |
| `ui-design-guidelines` | UI/UX 原則、アクセシビリティ |
| `backend-coding-guidelines` | UseCase、Repository、DTO パターン |
| `backend-test-guidelines` | PHPUnit テスト規約 |
| `backend-architecture-guidelines` | 7層設計、レイヤー分離、TypeScript型生成 |
| `security-guidelines` | IPA準拠セキュリティ診断ワークフロー（オンデマンド参照） |
| `bug-fixing` | 体系的なバグ調査・修正ワークフロー（10ステップ） |
| `review-fixing` | PRレビューコメント処理・修正ワークフロー（6ステップ、レビューループ対応） |

#### セキュリティ: Rules vs Skills の使い分け

- **Rules（`.claude/rules/security/`）**: プロジェクト全体の**必須セキュリティ規約**
  - すべてのコードで遵守すべき対策（SQLインジェクション、XSS、CSRF等）
  - 常に参照され、コード実装時に自動適用される
  - 例: Eloquent ORM必須、Blade `{{ }}` 必須、CSRF トークン必須

- **Skills（`security-guidelines`）**: セキュリティレビュー時の**診断ワークフロー**
  - オンデマンドで参照される実行手順
  - 既存コードのセキュリティ診断、レビュー時に使用
  - 例: IPA 11脆弱性の診断チェックリスト、修正手順

#### 実装時の Skill 参照

実装フェーズでは、対応する Skill を参照して詳細なガイドラインを確認すること。

| フェーズ | 領域 | 参照 Skill |
|---------|------|-----------|
| Phase 2: Implementation | Backend | `Skill('backend-coding-guidelines')` |
| Phase 2: Implementation | Frontend | `Skill('coding-guidelines')` |
| Phase 2: Implementation | Security Review | `Skill('security-guidelines')` |
| Testing | Backend (PHPUnit) | `Skill('backend-test-guidelines')` |
| Testing | Frontend (Vitest/RTL) | `Skill('test-guidelines')` |
| Testing | Storybook | `Skill('storybook-guidelines')` |

### MCPs

| MCP | 用途 |
|-----|------|
| Kiri | セマンティックコード検索、依存関係分析 |
| Context7 | ライブラリドキュメント取得 |
| Serena | シンボルベースコード編集 |
| Codex | AI コードレビュー |
| Chrome DevTools | ブラウザ自動化 |

## コーディング原則（クイックリファレンス）

### 共通
- TypeScript/PHP の型定義は厳格に（`any` 禁止）
- コード内コメントは日本語

### フロントエンド
- バレルインポート禁止（直接パス指定）
- データ取得はカスタムフックに分離
- コンポーネントはプレゼンテーショナルに保つ
- Page コンポーネントのみ `export default` 許可、その他は名前付きエクスポート

### バックエンド
- UseCase は Laravel Data の DTO を使用
- Repository は Interface 経由でアクセス
- Controller は UseCase のみを呼び出し、ビジネスロジックを含まない
- TypeScript型は自動生成（`php artisan typescript:transform`）

## 重要な原則

1. **フェーズをスキップしない** - 「簡単なタスク」という判断は禁物
2. **Quality Checks は必須** - すべてのチェックをパスするまで次に進まない
3. **エラーは完全修正** - 放置して次に進まない
4. **Agent を活用** - 計画と実装は Agent に任せる
5. **フォームは Precognition** - `@inertiajs/react` の `useForm` 使用禁止
6. **ハイブリッドアーキテクチャ遵守** - 静的は Inertia、動的は API

===

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to enhance the user's satisfaction building Laravel applications.

## Foundational Context
This application is a Laravel application and its main Laravel ecosystems package & versions are below. You are an expert with them all. Ensure you abide by these specific packages & versions.

- php - 8.4.16
- laravel/framework (LARAVEL) - v12
- laravel/prompts (PROMPTS) - v0
- laravel/mcp (MCP) - v0
- laravel/pint (PINT) - v1
- laravel/sail (SAIL) - v1
- phpunit/phpunit (PHPUNIT) - v11
- tailwindcss (TAILWINDCSS) - v4

## Conventions
- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts
- Do not create verification scripts or tinker when tests cover that functionality and prove it works. Unit and feature tests are more important.

## Application Structure & Architecture
- Stick to existing directory structure - don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling
- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `yarn run build`, `yarn run dev`, or `composer run dev`. Ask them.

## Replies
- Be concise in your explanations - focus on what's important rather than explaining obvious details.

## Documentation Files
- You must only create documentation files if explicitly requested by the user.


=== boost rules ===

## Laravel Boost
- Laravel Boost is an MCP server that comes with powerful tools designed specifically for this application. Use them.

## Artisan
- Use the `list-artisan-commands` tool when you need to call an Artisan command to double check the available parameters.

## URLs
- Whenever you share a project URL with the user you should use the `get-absolute-url` tool to ensure you're using the correct scheme, domain / IP, and port.

## Tinker / Debugging
- You should use the `tinker` tool when you need to execute PHP to debug code or query Eloquent models directly.
- Use the `database-query` tool when you only need to read from the database.

## Reading Browser Logs With the `browser-logs` Tool
- You can read browser logs, errors, and exceptions using the `browser-logs` tool from Boost.
- Only recent browser logs will be useful - ignore old logs.

## Searching Documentation (Critically Important)
- Boost comes with a powerful `search-docs` tool you should use before any other approaches. This tool automatically passes a list of installed packages and their versions to the remote Boost API, so it returns only version-specific documentation specific for the user's circumstance. You should pass an array of packages to filter on if you know you need docs for particular packages.
- The 'search-docs' tool is perfect for all Laravel related packages, including Laravel, Inertia, Livewire, Filament, Tailwind, Pest, Nova, Nightwatch, etc.
- You must use this tool to search for Laravel-ecosystem documentation before falling back to other approaches.
- Search the documentation before making code changes to ensure we are taking the correct approach.
- Use multiple, broad, simple, topic based queries to start. For example: `['rate limiting', 'routing rate limiting', 'routing']`.
- Do not add package names to queries - package information is already shared. For example, use `test resource table`, not `filament 4 test resource table`.

### Available Search Syntax
- You can and should pass multiple queries at once. The most relevant results will be returned first.

1. Simple Word Searches with auto-stemming - query=authentication - finds 'authenticate' and 'auth'
2. Multiple Words (AND Logic) - query=rate limit - finds knowledge containing both "rate" AND "limit"
3. Quoted Phrases (Exact Position) - query="infinite scroll" - Words must be adjacent and in that order
4. Mixed Queries - query=middleware "rate limit" - "middleware" AND exact phrase "rate limit"
5. Multiple Queries - queries=["authentication", "middleware"] - ANY of these terms


=== php rules ===

## PHP

- Always use curly braces for control structures, even if it has one line.

### Constructors
- Use PHP 8 constructor property promotion in `__construct()`.
    - <code-snippet>public function __construct(public GitHub $github) { }</code-snippet>
- Do not allow empty `__construct()` methods with zero parameters.

### Type Declarations
- Always use explicit return type declarations for methods and functions.
- Use appropriate PHP type hints for method parameters.

<code-snippet name="Explicit Return Types and Method Params" lang="php">
protected function isAccessible(User $user, ?string $path = null): bool
{
    ...
}
</code-snippet>

## Comments
- Prefer PHPDoc blocks over comments. Never use comments within the code itself unless there is something _very_ complex going on.

## PHPDoc Blocks
- Add useful array shape type definitions for arrays when appropriate.

## Enums
- Typically, keys in an Enum should be TitleCase. For example: `FavoritePerson`, `BestLake`, `Monthly`.


=== laravel/core rules ===

## Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using the `list-artisan-commands` tool.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Database
- Always use proper Eloquent relationship methods with return type hints. Prefer relationship methods over raw queries or manual joins.
- Use Eloquent models and relationships before suggesting raw database queries
- Avoid `DB::`; prefer `Model::query()`. Generate code that leverages Laravel's ORM capabilities rather than bypassing them.
- Generate code that prevents N+1 query problems by using eager loading.
- Use Laravel's query builder for very complex database operations.

### Model Creation
- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `list-artisan-commands` to check the available options to `php artisan make:model`.

### APIs & Eloquent Resources
- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

### Controllers & Validation
- Always create Form Request classes for validation rather than inline validation in controllers. Include both validation rules and custom error messages.
- Check sibling Form Requests to see if the application uses array or string based validation rules.

### Queues
- Use queued jobs for time-consuming operations with the `ShouldQueue` interface.

### Authentication & Authorization
- Use Laravel's built-in authentication and authorization features (gates, policies, Sanctum, etc.).

### URL Generation
- When generating links to other pages, prefer named routes and the `route()` function.

### Configuration
- Use environment variables only in configuration files - never use the `env()` function directly outside of config files. Always use `config('app.name')`, not `env('APP_NAME')`.

### Testing
- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

### Vite Error
- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `yarn run build` or ask the user to run `yarn run dev` or `composer run dev`.


=== laravel/v12 rules ===

## Laravel 12

- Use the `search-docs` tool to get version specific documentation.
- Since Laravel 11, Laravel has a new streamlined file structure which this project uses.

### Laravel 12 Structure
- No middleware files in `app/Http/Middleware/`.
- `bootstrap/app.php` is the file to register middleware, exceptions, and routing files.
- `bootstrap/providers.php` contains application specific service providers.
- **No app\Console\Kernel.php** - use `bootstrap/app.php` or `routes/console.php` for console configuration.
- **Commands auto-register** - files in `app/Console/Commands/` are automatically available and do not require manual registration.

### Database
- When modifying a column, the migration must include all of the attributes that were previously defined on the column. Otherwise, they will be dropped and lost.
- Laravel 11 allows limiting eagerly loaded records natively, without external packages: `$query->latest()->limit(10);`.

### Models
- Casts can and likely should be set in a `casts()` method on a model rather than the `$casts` property. Follow existing conventions from other models.


=== pint/core rules ===

## Laravel Pint Code Formatter

- You must run `vendor/bin/pint --dirty` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test`, simply run `vendor/bin/pint` to fix any formatting issues.


=== phpunit/core rules ===

## PHPUnit Core

- This application uses PHPUnit for testing. All tests must be written as PHPUnit classes. Use `php artisan make:test --phpunit {name}` to create a new test.
- If you see a test using "Pest", convert it to PHPUnit.
- Every time a test has been updated, run that singular test.
- When the tests relating to your feature are passing, ask the user if they would like to also run the entire test suite to make sure everything is still passing.
- Tests should test all of the happy paths, failure paths, and weird paths.
- You must not remove any tests or test files from the tests directory without approval. These are not temporary or helper files, these are core to the application.

### Running Tests
- Run the minimal number of tests, using an appropriate filter, before finalizing.
- To run all tests: `php artisan test`.
- To run all tests in a file: `php artisan test tests/Feature/ExampleTest.php`.
- To filter on a particular test name: `php artisan test --filter=testName` (recommended after making a change to a related file).


=== tailwindcss/core rules ===

## Tailwind Core

- Use Tailwind CSS classes to style HTML, check and use existing tailwind conventions within the project before writing your own.
- Offer to extract repeated patterns into components that match the project's conventions (i.e. Blade, JSX, Vue, etc..)
- Think through class placement, order, priority, and defaults - remove redundant classes, add classes to parent or child carefully to limit repetition, group elements logically
- You can use the `search-docs` tool to get exact examples from the official documentation when needed.

### Spacing
- When listing items, use gap utilities for spacing, don't use margins.

    <code-snippet name="Valid Flex Gap Spacing Example" lang="html">
        <div class="flex gap-8">
            <div>Superior</div>
            <div>Michigan</div>
            <div>Erie</div>
        </div>
    </code-snippet>


### Dark Mode
- If existing pages and components support dark mode, new pages and components must support dark mode in a similar way, typically using `dark:`.


=== tailwindcss/v4 rules ===

## Tailwind 4

- Always use Tailwind CSS v4 - do not use the deprecated utilities.
- `corePlugins` is not supported in Tailwind v4.
- In Tailwind v4, configuration is CSS-first using the `@theme` directive — no separate `tailwind.config.js` file is needed.
<code-snippet name="Extending Theme in CSS" lang="css">
@theme {
  --color-brand: oklch(0.72 0.11 178);
}
</code-snippet>

- In Tailwind v4, you import Tailwind using a regular CSS `@import` statement, not using the `@tailwind` directives used in v3:

<code-snippet name="Tailwind v4 Import Tailwind Diff" lang="diff">
   - @tailwind base;
   - @tailwind components;
   - @tailwind utilities;
   + @import "tailwindcss";
</code-snippet>


### Replaced Utilities
- Tailwind v4 removed deprecated utilities. Do not use the deprecated option - use the replacement.
- Opacity values are still numeric.

| Deprecated |	Replacement |
|------------+--------------|
| bg-opacity-* | bg-black/* |
| text-opacity-* | text-black/* |
| border-opacity-* | border-black/* |
| divide-opacity-* | divide-black/* |
| ring-opacity-* | ring-black/* |
| placeholder-opacity-* | placeholder-black/* |
| flex-shrink-* | shrink-* |
| flex-grow-* | grow-* |
| overflow-ellipsis | text-ellipsis |
| decoration-slice | box-decoration-slice |
| decoration-clone | box-decoration-clone |
</laravel-boost-guidelines>
