# Laravel連携：E2Eテストデータ準備（自前 testing コマンド + TSラッパー）

PlaywrightからLaravelのDBを「お掃除（reset）」「生成（factory / scenario）」するための連携パターン。

外部パッケージ（`hyvor/laravel-playwright` 等）には依存せず、**testing環境専用のArtisanコマンド**と、それを叩く**薄いTypeScriptラッパー**だけで構成する。

## なぜ自前コマンド方式か（設計判断）

| 観点 | 自前コマンド + CLI（本方式） | 外部パッケージのHTTPルート方式 |
|------|------------------------------|--------------------------------|
| **攻撃面** | アプリにテスト用HTTPルートを生やさない（攻撃面ゼロ） | テスト用エンドポイントがアプリに常駐し、設定ミスで本番露出のリスク |
| **セキュリティ規約** | 生SQL口を持たない・最小権限。`.claude/rules/security/` と無矛盾 | 任意artisan・生SQL実行が可能で、規約（生SQL禁止・バックドア禁止）と衝突 |
| **保守リスク** | `Model::factory()` / `Artisan::call()` という公開APIのみ使用。Laravelアップグレード耐性が高い | factory解決・route・kernel の内部APIに密結合し、メジャーアップグレードで壊れやすい |
| **依存** | composer/npm パッケージ追加なし | composer + npm の2パッケージを追従する必要 |
| **テンプレート規約性** | 「テスト支援機能はCLI境界に閉じる」と明示できる | 便利だが権限が広く、お手本にしづらい |

> **前提**: E2Eの実行対象は「自分たちで `artisan` を叩けるローカル / CI内コンテナ」とする。リモート環境にHTTPでのみ向ける構成が必要になった場合は、末尾「[補足：HTTP方式が必要な場合](#補足httpでしかデータ準備できない場合)」を参照。

## 目次

- [全体像](#全体像)
- [設計4原則](#設計4原則)
- [Laravel側の実装](#laravel側の実装)
- [Playwright側（TSラッパー）](#playwright側tsラッパー)
- [playwright.config.ts](#playwrightconfigts)
- [使い方パターン](#使い方パターン)
- [セキュアな認証情報管理](#セキュアな認証情報管理)
- [並列実行とDB分離](#並列実行とdb分離)
- [トラブルシューティング](#トラブルシューティング)
- [補足：HTTPでしかデータ準備できない場合](#補足httpでしかデータ準備できない場合)

## 全体像

```
┌──────────────── Playwright (Node) ────────────────┐
│  test(async ({ laravel, page }) => {              │
│    await laravel.reset({ seed: true });           │
│    const user = await laravel.factory('user', …); │
│    await page.goto('/login');                     │
│  });                                              │
│            │  child_process (execFile)            │
│            ▼                                       │
│   E2E_ARTISAN = "docker compose exec -T app        │
│                  php artisan"  (local)             │
│                = "php artisan"  (CI)               │
└────────────│───────────────────────────────────────┘
             ▼
┌──────────── Laravel (testing env) ────────────────┐
│  php artisan testing:reset                         │
│  php artisan testing:factory user '{…}' --state=…  │
│  php artisan testing:scenario organization-owner   │
│            │  許可リスト + 環境ガード               │
│            ▼  JSON契約 { ok, data } を stdout へ    │
│  Model::factory() / Seeder / Scenario クラス        │
└────────────────────────────────────────────────────┘
```

## 設計4原則

1. **CLI境界に閉じる** — テスト支援はArtisanコマンドのみ。HTTPルートを生やさない。
2. **許可リスト方式** — Playwrightからはクラス名ではなく論理名（`user` 等）だけ渡す。許可リストにない対象は実行不可。
3. **二層のデータ生成** — 低レベル `testing:factory`（単発factory）と高レベル `testing:scenario`（業務語彙のシナリオseeder）を併用。
4. **JSON契約の固定** — コマンド出力はE2E専用DTO（`{ ok, data }` / 失敗は `{ ok:false, error }`）。Eloquentモデルをそのまま返さず、公開する属性を明示。

## Laravel側の実装

### 配置（testing用名前空間に隔離）

7層アーキテクチャ本体（UseCase/Repository等）を汚さないよう、テスト支援コードは専用の場所に隔離する。

```
app/Console/Commands/Testing/
├── AbstractTestingCommand.php   # 環境ガード + JSON応答ヘルパー（基底）
├── ResetCommand.php             # testing:reset
├── MakeFactoryCommand.php       # testing:factory
└── RunScenarioCommand.php       # testing:scenario
app/Testing/Scenarios/
├── ScenarioContract.php         # シナリオの共通インターフェース
└── OrganizationOwnerScenario.php
config/e2e.php                   # 許可リスト（factories / scenarios）
```

> **deptrac / 本番混入対策**: `app/Testing/*` と `app/Console/Commands/Testing/*` はテスト支援専用のため、deptrac のレイヤー定義から除外（または専用レイヤーとして隔離）する。本番ビルドへ混入しないことをCIで検査するとなお良い（後述）。

### 許可リスト（config/e2e.php）

論理名 → クラス + 公開属性（`expose`）のマッピング。`expose` で返却属性を絞り、パスワード・トークン等の機密を漏らさない。

```php
<?php

declare(strict_types=1);

use App\Models\Organization;
use App\Models\User;
use App\Testing\Scenarios\OrganizationOwnerScenario;

return [
    /**
     * testing:factory で生成を許可するモデル。
     * expose: JSONで返してよい属性のホワイトリスト。
     *
     * @var array<string, array{class: class-string, expose: list<string>}>
     */
    'factories' => [
        'user' => ['class' => User::class, 'expose' => ['id', 'name', 'email']],
        'organization' => ['class' => Organization::class, 'expose' => ['id', 'name']],
    ],

    /**
     * testing:scenario で実行を許可するシナリオ。
     *
     * @var array<string, class-string<\App\Testing\Scenarios\ScenarioContract>>
     */
    'scenarios' => [
        'organization-owner' => OrganizationOwnerScenario::class,
    ],
];
```

### 基底コマンド（環境ガード + JSON応答）

すべてのtestingコマンドはここを継承し、**`testing` 環境以外では即失敗**させる（多層防御：TSラッパー側のenv指定だけに依存しない）。

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands\Testing;

use Illuminate\Console\Command;

abstract class AbstractTestingCommand extends Command
{
    final public function handle(): int
    {
        if (! app()->environment('testing')) {
            return $this->fail('NOT_TESTING_ENV', 'This command is only available in the testing environment.');
        }

        return $this->handleTesting();
    }

    abstract protected function handleTesting(): int;

    /**
     * @param  array<string, mixed>  $data
     */
    protected function ok(array $data = []): int
    {
        $this->line((string) json_encode(['ok' => true, 'data' => $data]));

        return self::SUCCESS;
    }

    protected function fail(string $code, string $message): int
    {
        $this->line((string) json_encode([
            'ok' => false,
            'error' => ['code' => $code, 'message' => $message],
        ]));

        return self::FAILURE;
    }
}
```

> **stdout を汚さない**: JSONは `stdout` の1行のみに保つ。ログ・警告は `stderr`（`$this->error()` ではなく `Log` か `$this->components->...` ではなく純粋にstderr）へ。`execFile` は stdout/stderr を分離して取得するため、警告が混じってもJSON parseは壊れない。

### testing:reset

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands\Testing;

use Illuminate\Support\Facades\Artisan;

class ResetCommand extends AbstractTestingCommand
{
    protected $signature = 'testing:reset {--seed : 基本シーダーも実行する}';

    protected $description = '[testing] DBをリセットする（E2E用）';

    protected function handleTesting(): int
    {
        if (Artisan::call('migrate:fresh', ['--force' => true]) !== self::SUCCESS) {
            return $this->fail('RESET_FAILED', 'migrate:fresh failed.');
        }

        if ($this->option('seed') && Artisan::call('db:seed', ['--force' => true]) !== self::SUCCESS) {
            return $this->fail('RESET_FAILED', 'db:seed failed.');
        }

        return $this->ok();
    }
}
```

### testing:factory

論理名 + JSON属性を受け取り、許可リストに従って生成。`expose` で絞った属性のみ返す。

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands\Testing;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

class MakeFactoryCommand extends AbstractTestingCommand
{
    protected $signature = 'testing:factory
        {model : 許可リスト上の論理名（例: user）}
        {attributes= : JSON文字列の属性（省略時は空。signatureのデフォルトに{}は使えないため空文字）}
        {--state= : 適用するファクトリーステート（カンマ区切り）}
        {--count=1 : 生成件数}';

    protected $description = '[testing] 許可リストのモデルをファクトリー生成する（E2E用）';

    protected function handleTesting(): int
    {
        $name = (string) $this->argument('model');
        $config = config("e2e.factories.{$name}");

        if ($config === null) {
            return $this->fail('MODEL_NOT_ALLOWED', "Factory '{$name}' is not allowed.");
        }

        /** @var array{class: class-string<Model>, expose: list<string>} $config */
        $attributes = json_decode((string) $this->argument('attributes'), true) ?? [];
        $count = max(1, (int) $this->option('count'));

        $factory = $config['class']::factory();
        $factory = $this->applyStates($factory);

        $models = $factory->count($count)->create($attributes);

        $data = $models
            ->map(fn (Model $model): array => $model->only($config['expose']))
            ->all();

        return $this->ok($count === 1 ? ['model' => $data[0]] : ['models' => $data]);
    }

    private function applyStates(Factory $factory): Factory
    {
        $states = array_filter(explode(',', (string) $this->option('state')));

        foreach ($states as $state) {
            // 名前付きステートメソッド（例: ->admin()）のみを動的適用
            $factory = $factory->{$state}();
        }

        return $factory;
    }
}
```

### testing:scenario

業務語彙でデータ一式を組み立てる。シナリオは「安全なDTO（配列）」を返す責務を持つ。

```php
<?php

declare(strict_types=1);

namespace App\Testing\Scenarios;

/**
 * E2Eシナリオの共通インターフェース。
 * run() は JSON化して安全な配列（機密を含まない）を返すこと。
 */
interface ScenarioContract
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function run(array $payload): array;
}
```

```php
<?php

declare(strict_types=1);

namespace App\Testing\Scenarios;

use App\Models\Organization;
use App\Models\User;

class OrganizationOwnerScenario implements ScenarioContract
{
    public function run(array $payload): array
    {
        $organization = Organization::factory()->create();
        $owner = User::factory()->for($organization)->create([
            'email' => $payload['email'] ?? 'owner@example.com',
        ]);

        return [
            'organization' => $organization->only(['id', 'name']),
            'owner' => $owner->only(['id', 'name', 'email']),
        ];
    }
}
```

```php
<?php

declare(strict_types=1);

namespace App\Console\Commands\Testing;

use App\Testing\Scenarios\ScenarioContract;

class RunScenarioCommand extends AbstractTestingCommand
{
    protected $signature = 'testing:scenario
        {name : 許可リスト上のシナリオ名}
        {payload= : JSON文字列のペイロード（省略時は空）}';

    protected $description = '[testing] 許可リストのシナリオを実行する（E2E用）';

    protected function handleTesting(): int
    {
        $name = (string) $this->argument('name');
        $class = config("e2e.scenarios.{$name}");

        if ($class === null) {
            return $this->fail('SCENARIO_NOT_ALLOWED', "Scenario '{$name}' is not allowed.");
        }

        /** @var ScenarioContract $scenario */
        $scenario = app($class);
        $payload = json_decode((string) $this->argument('payload'), true) ?? [];

        return $this->ok($scenario->run($payload));
    }
}
```

### コマンドの登録範囲（任意：より厳格な隔離）

Laravel 12 は `app/Console/Commands/` 配下を自動登録する。基底コマンドの環境ガードにより本番では即失敗するため実害はないが、**本番の `artisan list` にも出さない**厳格運用を望む場合は、`testing` 環境でのみ登録する `TestingServiceProvider` を用意する。

```php
// app/Providers/TestingServiceProvider.php
// 上記コマンドの名前空間（App\Console\Commands\Testing）に合わせて登録する。
public function boot(): void
{
    if ($this->app->environment('testing') && $this->app->runningInConsole()) {
        $this->commands([
            \App\Console\Commands\Testing\ResetCommand::class,
            \App\Console\Commands\Testing\MakeFactoryCommand::class,
            \App\Console\Commands\Testing\RunScenarioCommand::class,
        ]);
    }
}
```

`bootstrap/providers.php` での登録自体を環境で分岐させると、本番コードベースから完全に切り離せる。なお、**本番の `artisan list` からも完全に消したい**場合は、コマンドを自動探索パス外（例: `app/Testing/Commands/`）へ移動し、それに合わせてクラスの `namespace` も `App\Testing\Commands` に変更したうえで、上記の `$this->commands([...])` の参照も同じ名前空間に揃えること（名前空間とパスを一致させる）。

## Playwright側（TSラッパー）

### 大前提：アプリ本体と artisan は「同一 testing 環境・同一DB」を指す

E2Eでは2つのプロセスが登場する。**両方が同じ testing 環境・同じDBを見ていないと整合しない**。

- **ブラウザがアクセスするアプリ**（`baseURL` 先 / `php artisan serve` 等）
- **`E2E_ARTISAN` が叩く artisan**（`testing:reset` / `factory` / `scenario`）

加えて `AbstractTestingCommand` は **`app()->environment('testing')` 以外を拒否**する。したがって artisan を実行する環境の `APP_ENV` が実際に `testing` になっている必要がある。`.env.testing` をリポジトリに置くだけでは通常の `php artisan` はそれを読まない（既定は `.env`）点に注意。

| 実行形態 | 揃え方 | E2E_ARTISAN |
|---------|--------|-------------|
| **CI（ホスト直）** | ジョブの環境変数に `APP_ENV=testing` を設定（→ `.env.testing` がロードされ、`serve` も artisan も testing DB を共有） | `php artisan` |
| **ローカル（Docker）** | E2E対象アプリと artisan を `APP_ENV=testing` のコンテナ（testing用 compose profile / override 等）で起動し、同一 testing DB を見せる | `docker compose exec -T app php artisan` |
| 上記が難しい場合 | `--env=testing` を artisan と `serve` の**両方**に付与して強制的に testing をロード | `... php artisan --env=testing` |

### 環境差異は E2E_ARTISAN に集約

ローカル（Docker）とCI（ホスト直）の差異を**1つの環境変数**に閉じ込める。TS側にコマンド文字列を散らさない。

```bash
# ローカル（Docker）: コンテナが testing 環境（同一 testing DB）であること
E2E_ARTISAN="docker compose exec -T app php artisan"
```

```yaml
# CI（GitHub Actions）: ジョブ env に APP_ENV=testing を設定したうえで
env:
  APP_ENV: testing
  E2E_ARTISAN: "php artisan"
```

- `E2E_ARTISAN` は **Playwright（Node）プロセスの環境変数**として読まれる。`.env.testing`（PHP用）に書いても Node は自動ロードしないため、シェルで `export` するか、CIの `env:` に置くか、`playwright.config.ts` 冒頭で `dotenv` 等を使って読み込むこと。
- `-T` は擬似TTYを無効化（CI/非対話実行で必須）。
- 値は**空白区切りのトークン列**で記述する（各トークンに空白を含めない。動的なJSON引数はラッパー側で別トークンとして渡すため空白を含んでも安全）。

### laravel fixture（child_process）

`{ laravel, page }` という従来どおりのフィクスチャ体験を維持しつつ、中身を自前CLIに差し替える。

```typescript
// tests/e2e/fixtures/laravel.ts
import { test as base } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type JsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

/** E2E_ARTISAN を空白区切りで分解（例: docker compose exec -T app php artisan） */
function artisanTokens(): string[] {
  return (process.env.E2E_ARTISAN ?? 'docker compose exec -T app php artisan')
    .trim()
    .split(/\s+/);
}

async function runArtisan<T>(args: string[]): Promise<T> {
  const [bin, ...baseArgs] = artisanTokens();

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(bin, [...baseArgs, ...args], { timeout: 60_000 }));
  } catch (err) {
    // 想定内エラー（NOT_TESTING_ENV / MODEL_NOT_ALLOWED 等）はコマンドが終了コード1で返すため
    // execFile は reject する。その場合も stdout に JSON契約 { ok:false, error } が載っているので取り出す。
    const out = (err as { stdout?: string }).stdout ?? '';
    if (out.trim() === '') {
      throw err; // JSONなし = 想定外（プロセスクラッシュ等）→ そのまま投げる
    }
    stdout = out;
  }

  const result = JSON.parse(stdout.trim()) as JsonResult<T>;
  if (!result.ok) {
    throw new Error(`[laravel] ${result.error.code}: ${result.error.message}`);
  }
  return result.data;
}

export interface Laravel {
  reset(options?: { seed?: boolean }): Promise<void>;
  factory<T = Record<string, unknown>>(
    model: string,
    attributes?: Record<string, unknown>,
    options?: { state?: string | string[]; count?: number },
  ): Promise<T>;
  scenario<T = Record<string, unknown>>(
    name: string,
    payload?: Record<string, unknown>,
  ): Promise<T>;
}

export const laravel: Laravel = {
  async reset(options = {}) {
    const args = ['testing:reset'];
    if (options.seed) args.push('--seed');
    await runArtisan<Record<string, never>>(args);
  },

  async factory(model, attributes = {}, options = {}) {
    const args = ['testing:factory', model, JSON.stringify(attributes)];
    if (options.state) {
      const state = Array.isArray(options.state) ? options.state.join(',') : options.state;
      args.push('--state', state);
    }
    if (options.count) args.push('--count', String(options.count));
    // count=1 は { model }、count>1 は { models } を data に返す（下記の使い方参照）
    return runArtisan(args);
  },

  async scenario(name, payload = {}) {
    return runArtisan(['testing:scenario', name, JSON.stringify(payload)]);
  },
};

export const test = base.extend<{ laravel: Laravel }>({
  laravel: async ({}, use) => {
    await use(laravel);
  },
});

export { expect } from '@playwright/test';
```

> **fixtureの合成**: Page Object 用の `testSetup.ts` と統合する場合は、`base` の代わりにこの `test` を `extend` の起点にする（`fixtures-guide.md` 参照）。

## playwright.config.ts

DBリセットは原則 **globalSetup で1回**（または `beforeAll`）。テストごとの `migrate:fresh` は遅く不安定なので避ける。

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // setup ファイル（*.setup.ts）も発見対象に含めるため testDir は tests/e2e 全体にする。
  // testDir を tests/e2e/tests に絞ると tests/e2e/auth.setup.ts が発見されず setup プロジェクトが動かない。
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  // 共有DB + globalSetup でのリセットを前提とするため、初期は直列を推奨（後述）
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      // setup ファイルはブラウザプロジェクトで二重実行しないよう明示的に除外
      testIgnore: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
```

```typescript
// tests/e2e/global-setup.ts
import { laravel } from './fixtures/laravel';

export default async function globalSetup() {
  // 土台データ（マスタ・ロール等）は seeder に寄せる
  await laravel.reset({ seed: true });
}
```

## 使い方パターン

### データ準備（factory / scenario）

```typescript
import { test, expect } from '../fixtures/laravel';

test('ユーザー詳細表示', async ({ laravel, page }) => {
  // 低レベル: 単発factory（許可リストの論理名 'user'）
  const { model: user } = await laravel.factory<{ model: { id: number; name: string } }>(
    'user',
    { name: '山田太郎' },
  );

  await page.goto(`/users/${user.id}`);
  await expect(page.getByText('山田太郎')).toBeVisible();
});

test('組織オーナーのダッシュボード', async ({ laravel, page }) => {
  // 高レベル: 業務語彙のシナリオ
  const { owner } = await laravel.scenario<{ owner: { id: number; email: string } }>(
    'organization-owner',
    { email: 'owner@example.com' },
  );

  await page.goto('/login');
  // owner.email でログイン …
});
```

### 認証セットアップ（auth.setup.ts）

```typescript
// tests/e2e/auth.setup.ts
import { test as setup } from './fixtures/laravel';

const authFile = 'playwright/.auth/user.json';

setup('認証セットアップ', async ({ laravel, page }) => {
  const { model: user } = await laravel.factory<{ model: { email: string } }>('user', {
    email: 'e2e-user@example.com',
  });

  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(user.email);
  await page.getByLabel('パスワード').fill('password'); // ファクトリーデフォルト
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL('/dashboard');

  await page.context().storageState({ path: authFile });
});
```

### 権限テスト

```typescript
test('管理者のみアクセス可能', async ({ laravel, page }) => {
  const { model: admin } = await laravel.factory<{ model: { email: string } }>(
    'user',
    {},
    { state: 'admin' },
  );

  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill(admin.email);
  await page.getByLabel('パスワード').fill('password');
  await page.getByRole('button', { name: 'ログイン' }).click();

  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
});
```

> **DB状態の検証**: 「登録後にDBへ保存されたか」を確認したい場合も、生SQLは使わず `testing:scenario`（または専用の確認用シナリオ）経由で取得する。生SQLをE2Eから叩く口は作らない。

## セキュアな認証情報管理

### 禁止事項

```typescript
// ❌ 本番の認証情報を使用
await page.getByLabel('メールアドレス').fill('admin@production.com');

// ❌ ソースにクレデンシャルをコミット
const API_KEY = 'sk-live-xxx...';
```

### 推奨パターン

```typescript
// ✅ ファクトリーで動的生成（衝突回避に時刻等を付与）
const { model } = await laravel.factory<{ model: { email: string } }>('user', {
  email: `e2e-${Date.now()}@example.com`,
});

// ✅ 環境変数から取得
const testUser = {
  email: process.env.TEST_USER_EMAIL!,
  password: process.env.TEST_USER_PASSWORD!,
};
```

```bash
# テスト用クレデンシャル（本番と異なる値を使用）
# これらは Playwright(Node) の process.env から読むため、E2E_ARTISAN と同様に
# シェルの export / CIの env / playwright.config の dotenv ロードで Node に渡す。
# Laravel用の .env.testing（APP_ENV/DB等）とは読み込み経路が異なる点に注意。
export TEST_USER_EMAIL=test@example.com
export TEST_USER_PASSWORD=testpassword123
```

```bash
# .gitignore
playwright/.auth/
```

認証状態ファイル（`playwright/.auth/`）はGitにコミットしないこと。

## 並列実行とDB分離

`globalSetup` で共有DBを1回リセットする構成のため、**初期は `workers: 1`（直列）を標準**とする。Playwrightの並列workerは共有DBを奪い合い、フレーキーの原因になる。

並列化が要件化したら、以下のいずれかでworker単位にDBを分離する。

- worker ごとに別DB（`DB_DATABASE=test_${TEST_WORKER_INDEX}`）を用意し、`testing:reset` をworkerごとに実行
- スキーマ / テーブルprefix分離
- 各テストはユニークなデータのみ生成し、全体resetは1回に限定

## トラブルシューティング

### JSONパースに失敗する

- コマンドが**stdoutにJSON以外を出していないか**確認（警告・ログは `stderr` へ）。
- `APP_DEBUG=true` によるダンプ出力が混入していないか（`.env.testing` で `APP_DEBUG=false` 推奨）。
- `docker compose exec` に `-T` を付けているか（TTY制御文字の混入防止）。

### `NOT_TESTING_ENV` が返る

- 実行先コンテナの `APP_ENV` が `testing` か確認。`E2E_ARTISAN` に `--env=testing` を付与するか、`.env.testing` を読ませる構成にする。

### `MODEL_NOT_ALLOWED` / `SCENARIO_NOT_ALLOWED`

- `config/e2e.php` の許可リストに論理名を追加したか確認。クラス名・名前空間はTS側から渡さない（許可リスト経由のみ）。

### コマンドが見つからない

- 厳格隔離（TestingServiceProvider）構成の場合、`testing` 環境でのみ登録される。`APP_ENV=testing` で `artisan list` に出るか確認。

### 接続できない

- Laravelサーバー（`baseURL`）が起動しているか、Dockerコンテナが立っているかを確認。

## 補足：HTTPでしかデータ準備できない場合

リモートのレビュー環境・クラウド上の一時環境にPlaywrightを向ける等、`artisan` を直接叩けない構成が**要件化した場合のみ**、HTTPエンドポイント方式を例外として検討する。その場合も以下を必須条件とする。

- `APP_ENV=testing` 以外では登録しない（専用ServiceProviderで隔離）
- `reset` / `factory` / `scenario` のみ提供（**生SQLは不可**）
- 共有シークレットヘッダ必須＋必要に応じてIP制限・ネットワーク分離
- 本番ビルドに混入しないことをCIで検査

デフォルトはあくまでCLI方式（本ドキュメント本文）であり、HTTP方式は明確な条件付きの例外とする。
