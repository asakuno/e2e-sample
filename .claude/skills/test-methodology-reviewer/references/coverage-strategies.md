# カバレッジ戦略

## 目次

1. [テストピラミッド](#1-テストピラミッド)
2. [カバレッジの種類と目標](#2-カバレッジの種類と目標)
3. [効率的なテスト戦略](#3-効率的なテスト戦略)
4. [カバレッジ改善の優先順位](#4-カバレッジ改善の優先順位)
5. [テストの種類別戦略](#5-テストの種類別戦略)
6. [ミューテーションテスト](#6-ミューテーションテスト)
7. [契約テスト（Contract Testing）](#7-契約テストcontract-testing)
8. [パフォーマンステスト](#8-パフォーマンステスト)
9. [テスト戦略のチェックリスト](#9-テスト戦略のチェックリスト)
10. [カバレッジの落とし穴](#10-カバレッジの落とし穴)
11. [カバレッジ測定コマンド](#11-カバレッジ測定コマンド)

---

## 1. テストピラミッド

テストの種類と量のバランスを示すモデル。

```
                    ▲
                   /▲\
                  / E2E \        少ない（高コスト・低速）
                 /───────\
                /Integration\    中程度
               /─────────────\
              /     Unit      \  多い（低コスト・高速）
             /─────────────────\
```

### 推奨比率

| レベル | 比率 | 特徴 |
|--------|------|------|
| Unit | 70% | 高速、安定、低コスト |
| Integration | 20% | 結合点の検証 |
| E2E | 10% | クリティカルパスのみ |

### アンチパターン: 逆ピラミッド

```
             ▲
            /▲\
           / E2E \            多い（危険！）
          /───────\
         /Integration\        中程度
        /─────────────\
       /     Unit      \      少ない（危険！）
      /─────────────────\
```

**問題点:**
- テスト実行が遅い
- テストが不安定（Flaky）
- デバッグが困難
- コスト高

---

## 1.5 テストサイズ（Test Size）でレベルを判断する

テストピラミッドの「どのレベルに置くか」を客観的に判断するための補助軸として、**依存リソースの大きさ＝テストサイズ**で分類する考え方を併用する（出典: Google Testing Blog "Test Sizes" — 末尾の参考文献を参照）。

| 観点 | Small | Medium | Large |
|------|:-----:|:------:|:-----:|
| Network access | No | Localhost only | Yes |
| Database | No | Yes | Yes |
| File system access | No（Mock） | Yes | Yes |
| 外部システム利用 | No（Mock） | 非推奨 | Yes |
| 複数スレッド | No | Yes | Yes |
| Sleep | No | Yes | Yes |
| System properties | No | 一部上書き | Yes |
| 実行時間の目安(秒) | 〜60 | 〜300 | 1800+ |

### リグレッションは「目的」、E2Eは「手段（Largeレベル）」

**「回帰確認＝E2Eを追加」と短絡しない**こと。リグレッションテストは「変更後も既存仕様が維持されているか」を確認する**目的**であり、Unit / Integration / Feature / E2E を**横断**する。E2E は最も依存が多く遅く不安定化しやすい Large レベルであり、すべてをここに積むと逆ピラミッドに陥る。

判断の指針:

- **最小のテストサイズで確認できるものは下位レベルへ置く**。仕様ロジックや分岐は Small / Medium（同値分割・境界値・[原因結果グラフ→デシジョンテーブル](technique-selection.md)）で押さえる。
- **E2E（Large）に置く理由は「ユーザー価値の高い代表シナリオ」「統合境界」「Happy path」「重大リスク」に限定**する。失敗時の原因特定性・実行速度・保守性を考慮する。
- E2E に置くなら、**データセットアップも Large 相応に明示**する（再現性・独立性・初期化戦略。`playwright-guidelines` の `laravel-test-data-setup.md` を参照）。

### worked example: 同一機能を3サイズで切り分ける

「在庫数に応じた注文確定の可否判定」という同じ機能でも、テストサイズごとに**確認対象と Mock 境界が変わる**。

| サイズ | 何を検証するか | 依存境界 | 技法 / レベル |
|--------|----------------|----------|----------------|
| **Small** | 在庫判定ロジック（在庫0 / 残1 / 十分 などの境界） | 外部なし（在庫取得は Mock） | 同値分割・境界値（Unit） |
| **Medium** | 注文確定 UseCase → Repository（テストDBへ反映）。決済等の外部は Mock | DB=Localhost、外部=Mock | Feature / Integration |
| **Large（E2E）** | ブラウザでカート → 確定 → 完了画面（フルスタック） | 外部含め実依存 | Playwright シナリオ（Happy path 1〜2本） |

ポイント:

- **境界値の全パターン（在庫0/1/上限…）は Small で尽くす**。E2E で繰り返さない。
- E2E(Large) は「確定できる」代表 Happy path と、重大リスク（例: 在庫切れ時に確定させない）に絞る。
- サイズが上がるほど Mock 境界が外側へ動き、確認対象が「ロジック」→「結合」→「ユーザー価値」へ移る。

> E2Eシナリオ自体の起こし方（画面遷移図×アクティビティ図からの導出）は `playwright-guidelines` の `references/scenario-derivation.md` を参照。

---

## 2. カバレッジの種類と目標

### コードカバレッジの種類

| 種類 | 説明 | 推奨目標 |
|------|------|----------|
| **ステートメントカバレッジ** | 実行された行の割合 | 80%以上 |
| **ブランチカバレッジ** | 条件分岐の網羅率 | 70%以上 |
| **関数カバレッジ** | 呼び出された関数の割合 | 90%以上 |
| **条件カバレッジ** | 各条件のtrue/false | 60%以上 |

### レイヤー別カバレッジ目標

| レイヤー | 目標 | 理由 |
|----------|------|------|
| **UseCase** | 80%以上 | ビジネスロジックの核心 |
| **Repository** | 70%以上 | データアクセスの信頼性 |
| **Controller** | 70%以上 | API/Web エンドポイント |
| **Service** | 70%以上 | 共通ロジック |
| **UI コンポーネント** | 70%以上 | ユーザーインターフェース |
| **カスタムフック** | 80%以上 | 再利用可能なロジック |
| **ユーティリティ関数** | 80%以上 | 汎用関数 |

---

## 3. 効率的なテスト戦略

### リスクベーステスト

ビジネスリスクと技術リスクに基づいてテストの優先度を決定する。

```
高リスク（必須テスト）:
├─ 決済処理
├─ 認証・認可
├─ 個人情報の処理
└─ 外部API連携

中リスク（重点テスト）:
├─ データ登録・更新
├─ 検索・フィルタリング
└─ 通知機能

低リスク（基本テスト）:
├─ 静的ページ表示
├─ 設定変更
└─ ヘルプ機能
```

### リスク×複雑度マトリクス

|  | 低複雑度 | 高複雑度 |
|--|:--------:|:--------:|
| **高リスク** | Unit + E2E | Unit + Integration + E2E |
| **低リスク** | Unit のみ | Unit + Integration |

### リグレッションテストの選定（機能不動作起点）

「どの機能が動かないと、誰がどう困るか」から優先度を導く。リグレッションは新規欠陥の発見より**既存ふるまいの維持確認**が主目的である点を踏まえ、論理的な関係が満たされていることの確認にフォーカスする。

1. **機能不動作リスクの抽出**: 「この機能が動作しないと何が起きるか」を機能単位で洗い出す
2. **影響の評価（ステークホルダ別）**: 不動作時に誰に（利用者／運用者／経営／関係者）どの影響が及ぶか
3. **重篤度 × 発生頻度で優先度付け**: 重篤度（直接影響・波及影響・短期/長期の金銭影響から最も深刻なものを基準）、発生頻度（利用頻度 × 障害の発生しやすさ）
4. **テストサイズへの割当**: 優先度の高いものを、[1.5 テストサイズ](#15-テストサイズtest-sizeでレベルを判断する)の指針で適切なレベルへ配置

### リグレッションセットの維持基準（追加だけでなく削除・降格も）

リグレッションセットは肥大化しやすい。追加基準だけでなく**削除・降格の基準**を持つ。

- **降格**: E2E でしか検出できない価値がなくなったテストは Medium 以下へ移す
- **集約**: 重複する E2E は代表シナリオへ集約する
- **削除**: テストの目的（なぜこのテストが必要か）が説明できないものは、根拠を補うか削除する
- **根拠の明示**: 各テストに「対象機能 / リスク / 期待結果の根拠（仕様ID等）」を紐づけ、担当者交代でも意図が失われないようにする

---

## 4. カバレッジ改善の優先順位

### Step 1: クリティカルパスの特定

```typescript
// ビジネスクリティカルな機能を洗い出す
const criticalPaths = [
  'ユーザー登録',
  'ログイン/ログアウト',
  '商品購入',
  '決済処理',
  'パスワードリセット',
];
```

### Step 2: カバレッジレポートの分析

```bash
# Frontend (Vitest)
yarn test --coverage

# Backend (PHPUnit)
./vendor/bin/phpunit --coverage-text
```

### Step 3: 未カバー領域の優先度付け

| 優先度 | 条件 | アクション |
|--------|------|----------|
| P0 | クリティカルパス & カバレッジ < 50% | 即座にテスト追加 |
| P1 | クリティカルパス & カバレッジ < 80% | 今週中にテスト追加 |
| P2 | 非クリティカル & カバレッジ < 50% | 次スプリントで対応 |
| P3 | 非クリティカル & カバレッジ < 80% | バックログに追加 |

---

## 5. テストの種類別戦略

### Unit テスト戦略

```
目的: 単一の関数/メソッドの動作を検証

テスト対象:
├─ ビジネスロジック（UseCase）
├─ バリデーション
├─ 計算処理
├─ データ変換
└─ ユーティリティ関数

テストしないもの:
├─ フレームワークの機能
├─ 外部ライブラリの動作
└─ 純粋なデータクラス（getter/setter のみ）
```

### Integration テスト戦略

```
目的: コンポーネント間の結合を検証

テスト対象:
├─ Controller → UseCase → Repository
├─ API リクエスト/レスポンス
├─ データベース操作
└─ 外部サービス連携（モック使用）

ポイント:
├─ 実際のDBを使用（テスト用DB）
├─ トランザクションでロールバック
└─ 外部サービスはモック化
```

### E2E テスト戦略

```
目的: ユーザー視点でシステム全体を検証

テスト対象:
├─ クリティカルなユーザージャーニー
├─ 主要なビジネスフロー
└─ 複数画面にまたがる操作

制限事項:
├─ テスト数は最小限に（10-20件）
├─ 実行時間を制限（15分以内）
└─ 不安定なテストは即座に修正
```

---

## 6. ミューテーションテスト

ミューテーションテストは「テスト自体の品質」を測定する技法。コードに小さな変更（ミュータント）を加え、テストがその変更を検出できるかを確認する。

### ミューテーションテストの原理

```
元のコード:
  return age >= 18;

ミュータント（変更を加えたコード）:
  return age > 18;   ← 境界条件の変更
  return age <= 18;  ← 比較演算子の反転
  return true;       ← 条件の削除

テストがミュータントを「殺す」（検出する）→ テストは有効
テストがミュータントを「生き残らせる」→ テストに穴がある
```

### ミューテーションスコア

```
ミューテーションスコア = 殺されたミュータント数 / 全ミュータント数 × 100%

目標スコア:
- 80%以上: 良好なテストスイート
- 60-80%: 改善の余地あり
- 60%未満: テストの品質に問題
```

### Stryker（JavaScript/TypeScript）

```bash
# インストール
npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner
```

```json
// stryker.config.json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "yarn",
  "reporters": ["html", "clear-text", "progress"],
  "testRunner": "vitest",
  "vitest": {
    "configFile": "vitest.config.ts"
  },
  "coverageAnalysis": "perTest",
  "mutate": [
    "resources/js/**/*.ts",
    "!resources/js/**/*.test.ts",
    "!resources/js/**/*.spec.ts"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

```bash
# 実行
npx stryker run
```

### Infection（PHP）

```bash
# インストール
composer require --dev infection/infection
```

```json
// infection.json5
{
  "$schema": "vendor/infection/infection/resources/schema.json",
  "source": {
    "directories": ["app"]
  },
  "logs": {
    "text": "infection.log",
    "html": "infection.html"
  },
  "mutators": {
    "@default": true
  },
  "minMsi": 60,
  "minCoveredMsi": 80
}
```

```bash
# 実行
./vendor/bin/infection --threads=4
```

### ミューテーションテストを使うべき場面

| 場面 | 推奨度 | 理由 |
|------|:------:|------|
| クリティカルなビジネスロジック | ◎ | テストの穴を発見できる |
| 高カバレッジだがバグが多い | ◎ | カバレッジの質を検証できる |
| リファクタリング前 | ○ | 既存テストの信頼性を確認 |
| 全コードベース | △ | 実行時間が長くなる |
| UI コンポーネント | × | 変更検出が難しい |

### 注意点

```
実行時間:
- ミューテーションテストは時間がかかる（通常のテストの10-100倍）
- CI では差分のみに適用するか、夜間実行を検討

等価ミュータント:
- 動作が変わらないミュータントは除外が必要
- 例: return a + b; → return b + a; （可換性により等価）
```

---

## 7. 契約テスト（Contract Testing）

APIのコンシューマー（フロントエンド）とプロバイダー（バックエンド）間の「契約」を検証するテスト。マイクロサービスや API 連携で特に有効。

### 契約テストの原理

```
従来のE2Eテスト:
  Frontend ─────→ Backend
             実際のAPI呼び出し
  問題: 遅い、不安定、環境依存

契約テスト:
  Consumer ─────→ Contract ←───── Provider
             契約を共有
  利点: 高速、安定、独立してテスト可能
```

### Pact（Consumer-Driven Contract Testing）

#### Consumer（フロントエンド）側のテスト

```typescript
// user.pact.test.ts
import { Pact } from '@pact-foundation/pact';
import { UserApiClient } from './UserApiClient';

const provider = new Pact({
  consumer: 'FrontendApp',
  provider: 'UserService',
  port: 1234,
});

describe('User API Contract', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  it('ユーザーを取得できる', async () => {
    // 期待する契約を定義
    await provider.addInteraction({
      state: 'ユーザーID 1が存在する',
      uponReceiving: 'ユーザー取得リクエスト',
      withRequest: {
        method: 'GET',
        path: '/api/users/1',
        headers: {
          Accept: 'application/json',
        },
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          id: 1,
          name: Matchers.string('Test User'),
          email: Matchers.email(),
        },
      },
    });

    // 実際のAPIクライアントでテスト
    const client = new UserApiClient(`http://localhost:1234`);
    const user = await client.getUser(1);

    expect(user.id).toBe(1);
    expect(user.name).toBeDefined();
  });
});
```

#### Provider（バックエンド）側のテスト

```php
// tests/Pact/UserProviderTest.php
use PhpPact\Standalone\ProviderVerifier\ProviderVerifier;

class UserProviderTest extends TestCase
{
    public function test_契約を満たしている(): void
    {
        $config = new ProviderVerifierConfig();
        $config
            ->setProviderName('UserService')
            ->setProviderBaseUrl('http://localhost:8000')
            ->setPactBrokerUri('http://pact-broker.local')
            ->setPublishResults(true);

        $verifier = new ProviderVerifier($config);

        // プロバイダーの状態を設定
        $this->setupState('ユーザーID 1が存在する', function () {
            User::factory()->create(['id' => 1, 'name' => 'Test User']);
        });

        $verifier->verify();
    }
}
```

### 契約テストを使うべき場面

| 場面 | 推奨度 | 理由 |
|------|:------:|------|
| フロント・バック分離開発 | ◎ | 並行開発でのAPI整合性を保証 |
| マイクロサービス間連携 | ◎ | サービス間の契約を明示化 |
| 外部API連携 | ○ | 外部APIの変更を検知 |
| モノリシックアプリ | △ | E2Eテストで十分な場合が多い |
| 頻繁に変わるAPI | × | 契約の更新コストが高い |

### Pact Broker

```
契約の共有フロー:

1. Consumer がテスト実行 → Pact ファイル生成
2. Pact Broker にアップロード
3. Provider が Pact Broker から契約を取得
4. Provider がテスト実行 → 検証結果を Broker に報告
5. can-i-deploy で本番デプロイ可否を確認
```

```bash
# デプロイ可否の確認
pact-broker can-i-deploy \
  --pacticipant FrontendApp \
  --version 1.2.3 \
  --to production
```

---

## 8. パフォーマンステスト

アプリケーションの応答速度、スループット、リソース使用量を検証するテスト。

### パフォーマンステストの種類

| 種類 | 目的 | 例 |
|------|------|-----|
| **負荷テスト** | 通常負荷での性能を測定 | 100ユーザー同時アクセス |
| **ストレステスト** | 限界を超えた負荷での動作確認 | 10000ユーザー同時アクセス |
| **持続テスト** | 長時間稼働での安定性確認 | 24時間連続稼働 |
| **スパイクテスト** | 急激な負荷増減への対応確認 | 100→1000→100ユーザー |

### k6（負荷テスト）

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // 30秒で20ユーザーまで増加
    { duration: '1m', target: 20 },   // 1分間維持
    { duration: '30s', target: 0 },   // 30秒で0ユーザーまで減少
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95%のリクエストが500ms以内
    http_req_failed: ['rate<0.01'],    // エラー率1%未満
  },
};

export default function () {
  const res = http.get('http://localhost:8000/api/users');

  check(res, {
    'ステータスコードが200': (r) => r.status === 200,
    'レスポンス時間が500ms以内': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

```bash
# 実行
k6 run load-test.js
```

### Vitest でのパフォーマンステスト

```typescript
// performance.test.ts
describe('パフォーマンス', () => {
  it('ユーザー一覧取得が100ms以内で完了する', async () => {
    const start = performance.now();

    await fetchUsers();

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('大量データの処理が1秒以内で完了する', async () => {
    const largeDataset = generateLargeDataset(10000);

    const start = performance.now();
    processData(largeDataset);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000);
  });
});
```

### PHPUnit でのパフォーマンステスト

```php
public function test_ユーザー一覧取得が100ms以内で完了する(): void
{
    $start = microtime(true);

    $this->getJson('/api/users');

    $duration = (microtime(true) - $start) * 1000;
    $this->assertLessThan(100, $duration, 'レスポンス時間が100msを超えています');
}
```

### パフォーマンステストの指標

| 指標 | 説明 | 目標例 |
|------|------|-------|
| **レイテンシ** | リクエストからレスポンスまでの時間 | p95 < 500ms |
| **スループット** | 単位時間あたりの処理数 | 1000 req/s |
| **エラー率** | 失敗したリクエストの割合 | < 1% |
| **CPU使用率** | 負荷時のCPU使用量 | < 80% |
| **メモリ使用量** | 負荷時のメモリ消費 | < 2GB |

### パフォーマンステストを使うべき場面

| 場面 | 推奨度 | 理由 |
|------|:------:|------|
| リリース前 | ◎ | 本番での問題を事前に発見 |
| インフラ変更後 | ◎ | 性能劣化を検知 |
| 大規模イベント前 | ◎ | 想定負荷への耐性を確認 |
| 開発中の日常テスト | △ | 実行時間が長い |
| 単体機能のテスト | × | 単体テストで十分 |

---

## 9. テスト戦略のチェックリスト

### プロジェクト開始時

- [ ] テストピラミッドの比率を決定した
- [ ] カバレッジ目標を設定した
- [ ] クリティカルパスを特定した
- [ ] テスト環境を構築した
- [ ] CI/CD にテストを組み込んだ

### 機能実装時

- [ ] Unit テストを先に作成した（TDD）
- [ ] 境界値・同値分割を適用した
- [ ] 異常系をテストした
- [ ] カバレッジ目標を達成した

### リリース前

- [ ] すべてのテストがパスした
- [ ] カバレッジが目標を満たした
- [ ] E2E テストでクリティカルパスを確認した
- [ ] 性能テストを実施した（必要に応じて）

---

## 10. カバレッジの落とし穴

### 高カバレッジ ≠ 高品質

```typescript
// カバレッジ100%だがバグがあるテスト
function add(a: number, b: number): number {
  return a + b;
}

test('add returns a number', () => {
  const result = add(1, 2);
  expect(typeof result).toBe('number'); // 3であることを検証していない！
});
```

### カバレッジに含まれない品質

- **ユーザビリティ**: UIが使いやすいか
- **パフォーマンス**: 十分に高速か
- **セキュリティ**: 脆弱性がないか
- **アクセシビリティ**: 誰でも使えるか
- **保守性**: コードが理解しやすいか

### バランスの取れたアプローチ

```
カバレッジは手段であり目的ではない。

良いテスト = 高カバレッジ + 意味のあるアサーション + 保守性

カバレッジ目標は達成したが、以下も確認する:
├─ テストは何を検証しているか明確か
├─ テストが失敗したとき原因がわかるか
├─ テストの追加・修正が容易か
└─ テスト実行時間は許容範囲か
```

---

## 11. カバレッジ測定コマンド

### Frontend（Vitest）

```bash
# カバレッジレポート生成
yarn test --coverage

# HTMLレポート出力
yarn test --coverage --reporter=html

# 特定のカバレッジ閾値を要求
yarn test --coverage --coverage.thresholds.lines=80
```

### Backend（PHPUnit）

```bash
# テキストレポート
./vendor/bin/phpunit --coverage-text

# HTMLレポート
./vendor/bin/phpunit --coverage-html coverage

# Cloverフォーマット（CI用）
./vendor/bin/phpunit --coverage-clover coverage.xml
```

### CI/CD での活用

```yaml
# GitHub Actions 例
- name: Run tests with coverage
  run: yarn test --coverage

- name: Check coverage threshold
  run: yarn test --coverage --coverage.thresholds.lines=80 --coverage.thresholds.branches=80
```

---

## 参考文献

- Google Testing Blog. *Test Sizes*. 2010. https://testing.googleblog.com/2010/12/test-sizes.html （テストサイズ Small/Medium/Large の分類）
