# 株式情報分析Laravelアプリ ルーティング設計 / Controller設計 / 実装タスク分解

## 1. 前提

本ドキュメントは、以下の方針に基づき、Laravelアプリケーションのルーティング設計、Controller設計、実装タスクを整理する。

### 1.1 アプリケーション方針

- 本アプリケーションは、個人利用を前提とした株式情報分析アプリである。
- 米国株を主対象とし、日本株は将来拡張を前提とする。
- 保有株数、取得単価、損益、ポートフォリオ管理は対象外とする。
- ユーザーはウォッチリストに登録した銘柄について、株価、ニュース、AI分析、シグナルを確認する。
- 売買推奨、自動売買、証券会社API連携は行わない。
- MVPではアラート機能は対象外とする。
- UIはNotion / 管理画面風のサイドバー型レイアウトとする。

### 1.2 MVP対象画面

MVPで実装する画面は以下とする。

| 画面 | URL | 目的 |
|---|---|---|
| ダッシュボード | `/dashboard` | ウォッチリスト全体の状況、注目銘柄、重要ニュースを確認する |
| 銘柄一覧 | `/stocks` | 銘柄検索、ウォッチリスト追加を行う |
| 銘柄詳細 | `/stocks/{symbol}` | 1銘柄のAI分析、材料、ニュース、株価を確認する |
| ウォッチリスト | `/watchlists` | 監視銘柄、優先度、メモを管理する |
| ニュース一覧 | `/news` | ウォッチリスト関連ニュースを横断的に確認する |

### 1.3 MVP対象外画面

以下はMVPでは実装しない。

- `/alerts`
- `/signals`
- `/settings`
- `/admin`
- `/disclosures`
- 課金画面
- ユーザー管理画面
- 公開共有画面

---

## 2. ルーティング設計

## 2.1 基本方針

LaravelのWebルートは、認証済みユーザーのみが利用できる構成とする。

個人用アプリではあるが、外部公開や将来拡張を考慮し、Laravel Breezeによる認証を導入する。

### 方針

- `auth` middleware配下に主要画面を配置する。
- `verified` はMVPでは必須にしない。
- Controllerは画面単位・リソース単位で分離する。
- 外部API取得・AI分析・シグナル生成はControllerに書かず、Command / Job / Serviceに分離する。

---

## 2.2 Webルート一覧

### 認証前

| Method | URI | Name | Controller | Action | 用途 |
|---|---|---|---|---|---|
| GET | `/` | `home` | - | - | `/dashboard` へリダイレクト |
| GET | `/login` | `login` | Breeze | - | ログイン画面 |
| POST | `/login` | - | Breeze | - | ログイン処理 |
| POST | `/logout` | `logout` | Breeze | - | ログアウト |

### 認証後

| Method | URI | Name | Controller | Action | 用途 |
|---|---|---|---|---|---|
| GET | `/dashboard` | `dashboard` | `DashboardController` | `index` | ダッシュボード表示 |
| GET | `/stocks` | `stocks.index` | `StockController` | `index` | 銘柄一覧・検索 |
| GET | `/stocks/{stock:symbol}` | `stocks.show` | `StockController` | `show` | 銘柄詳細表示 |
| GET | `/watchlists` | `watchlists.index` | `WatchlistController` | `index` | ウォッチリスト一覧 |
| POST | `/watchlists` | `watchlists.store` | `WatchlistController` | `store` | ウォッチリスト追加 |
| PATCH | `/watchlists/{watchlist}` | `watchlists.update` | `WatchlistController` | `update` | 優先度・メモ更新 |
| DELETE | `/watchlists/{watchlist}` | `watchlists.destroy` | `WatchlistController` | `destroy` | ウォッチリスト削除 |
| GET | `/news` | `news.index` | `NewsController` | `index` | ニュース一覧 |

---

## 2.3 `routes/web.php` 設計案

```php
<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NewsController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\WatchlistController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('dashboard');
})->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->name('dashboard');

    Route::get('/stocks', [StockController::class, 'index'])
        ->name('stocks.index');

    Route::get('/stocks/{stock:symbol}', [StockController::class, 'show'])
        ->name('stocks.show');

    Route::get('/watchlists', [WatchlistController::class, 'index'])
        ->name('watchlists.index');

    Route::post('/watchlists', [WatchlistController::class, 'store'])
        ->name('watchlists.store');

    Route::patch('/watchlists/{watchlist}', [WatchlistController::class, 'update'])
        ->name('watchlists.update');

    Route::delete('/watchlists/{watchlist}', [WatchlistController::class, 'destroy'])
        ->name('watchlists.destroy');

    Route::get('/news', [NewsController::class, 'index'])
        ->name('news.index');
});

require __DIR__.'/auth.php';
```

---

## 2.4 将来追加予定ルート

MVP後に追加する可能性があるルートは以下とする。

| Method | URI | Name | 用途 |
|---|---|---|---|
| GET | `/signals` | `signals.index` | 銘柄別シグナル一覧 |
| GET | `/alerts` | `alerts.index` | アラート一覧 |
| POST | `/alerts` | `alerts.store` | アラート作成 |
| PATCH | `/alerts/{alert}` | `alerts.update` | アラート更新 |
| DELETE | `/alerts/{alert}` | `alerts.destroy` | アラート削除 |
| GET | `/disclosures` | `disclosures.index` | 開示情報一覧 |
| GET | `/disclosures/{disclosure}` | `disclosures.show` | 開示情報詳細 |
| GET | `/settings` | `settings.edit` | 設定画面 |
| PATCH | `/settings` | `settings.update` | 設定更新 |

---

# 3. Controller設計

## 3.1 Controller設計方針

Controllerは、以下の責務に限定する。

- リクエストの受け取り
- FormRequestによる入力検証
- 認可チェック
- Service / Query経由でデータ取得
- Viewへのデータ渡し
- リダイレクトとフラッシュメッセージ

Controllerに書かないものは以下とする。

- 外部API呼び出し
- ニュース取得処理
- AI分析処理
- シグナルスコア計算
- 複雑な集計ロジック
- バッチ処理

---

## 3.2 DashboardController

### 役割

ダッシュボード画面を表示する。

ウォッチリスト全体の状態、注目銘柄ランキング、重要ニュースを表示する。

### Action

| Action | Method / URI | 用途 |
|---|---|---|
| `index` | GET `/dashboard` | ダッシュボード表示 |

### 取得データ

- ウォッチリスト銘柄数
- 直近ポジティブ材料数
- 直近ネガティブ材料数
- 未分析ニュース数
- 注目銘柄ランキング
- 重要ニュース一覧
- 最新分析日時

### 依存Service案

```php
App\Services\Dashboard\DashboardSummaryService
```

### Controller例

```php
namespace App\Http\Controllers;

use App\Services\Dashboard\DashboardSummaryService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request, DashboardSummaryService $service)
    {
        $summary = $service->getSummaryForUser($request->user());

        return view('dashboard.index', [
            'summary' => $summary,
            'rankedStocks' => $summary->rankedStocks,
            'importantNews' => $summary->importantNews,
        ]);
    }
}
```

---

## 3.3 StockController

### 役割

銘柄一覧、銘柄詳細を表示する。

### Action

| Action | Method / URI | 用途 |
|---|---|---|
| `index` | GET `/stocks` | 銘柄検索・一覧表示 |
| `show` | GET `/stocks/{stock:symbol}` | 銘柄詳細表示 |

### `index` の機能

- 銘柄名・symbol検索
- 市場フィルタ
- 銘柄一覧表示
- ウォッチリスト追加ボタン表示

### クエリパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| `q` | string | symbolまたは銘柄名検索 |
| `market` | string | `us` / `jp` など |

### `show` の機能

- 銘柄基本情報表示
- 最新株価表示
- シグナルスコア表示
- AI分析サマリー表示
- ポジティブ材料表示
- ネガティブ材料表示
- 関連ニュース表示
- 日足チャート表示

### 依存Service案

```php
App\Services\Stocks\StockSearchService
App\Services\Stocks\StockDetailService
```

### Controller例

```php
namespace App\Http\Controllers;

use App\Models\Stock;
use App\Services\Stocks\StockDetailService;
use App\Services\Stocks\StockSearchService;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function index(Request $request, StockSearchService $service)
    {
        $stocks = $service->search(
            query: $request->string('q')->toString(),
            market: $request->string('market')->toString(),
            user: $request->user(),
        );

        return view('stocks.index', [
            'stocks' => $stocks,
            'q' => $request->query('q'),
            'market' => $request->query('market'),
        ]);
    }

    public function show(Request $request, Stock $stock, StockDetailService $service)
    {
        $detail = $service->getDetailForUser($stock, $request->user());

        return view('stocks.show', [
            'stock' => $stock,
            'detail' => $detail,
        ]);
    }
}
```

---

## 3.4 WatchlistController

### 役割

ユーザーのウォッチリストを管理する。

### Action

| Action | Method / URI | 用途 |
|---|---|---|
| `index` | GET `/watchlists` | ウォッチリスト一覧表示 |
| `store` | POST `/watchlists` | ウォッチリスト追加 |
| `update` | PATCH `/watchlists/{watchlist}` | priority / memo更新 |
| `destroy` | DELETE `/watchlists/{watchlist}` | ウォッチリスト削除 |

### 認可

- `watchlist.user_id === auth()->id()` のものだけ更新・削除できる。
- `Policy` を使用する。

### FormRequest

| Request | 用途 |
|---|---|
| `StoreWatchlistRequest` | ウォッチリスト追加 |
| `UpdateWatchlistRequest` | priority / memo更新 |

### バリデーション案

#### StoreWatchlistRequest

| 項目 | ルール |
|---|---|
| `stock_id` | required, exists:stocks,id |
| `priority` | nullable, in:low,medium,high |
| `memo` | nullable, string, max:1000 |

#### UpdateWatchlistRequest

| 項目 | ルール |
|---|---|
| `priority` | required, in:low,medium,high |
| `memo` | nullable, string, max:1000 |

### Controller例

```php
namespace App\Http\Controllers;

use App\Http\Requests\StoreWatchlistRequest;
use App\Http\Requests\UpdateWatchlistRequest;
use App\Models\Watchlist;
use App\Services\Watchlists\WatchlistService;
use Illuminate\Http\Request;

class WatchlistController extends Controller
{
    public function index(Request $request, WatchlistService $service)
    {
        $watchlists = $service->getForUser($request->user());

        return view('watchlists.index', [
            'watchlists' => $watchlists,
        ]);
    }

    public function store(StoreWatchlistRequest $request, WatchlistService $service)
    {
        $service->addStock(
            user: $request->user(),
            stockId: (int) $request->input('stock_id'),
            priority: $request->input('priority', 'medium'),
            memo: $request->input('memo'),
        );

        return back()->with('success', 'ウォッチリストに追加しました。');
    }

    public function update(UpdateWatchlistRequest $request, Watchlist $watchlist, WatchlistService $service)
    {
        $this->authorize('update', $watchlist);

        $service->update(
            watchlist: $watchlist,
            priority: $request->input('priority'),
            memo: $request->input('memo'),
        );

        return back()->with('success', 'ウォッチリストを更新しました。');
    }

    public function destroy(Watchlist $watchlist, WatchlistService $service)
    {
        $this->authorize('delete', $watchlist);

        $service->delete($watchlist);

        return back()->with('success', 'ウォッチリストから削除しました。');
    }
}
```

---

## 3.5 NewsController

### 役割

ウォッチリスト銘柄に関連するニュースを横断的に表示する。

### Action

| Action | Method / URI | 用途 |
|---|---|---|
| `index` | GET `/news` | ニュース一覧表示 |

### クエリパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| `stock_id` | integer | 銘柄フィルタ |
| `sentiment` | string | `positive` / `neutral` / `negative` |
| `period` | string | `today` / `7d` / `30d` |

### 表示項目

- 銘柄symbol
- ニュースタイトル
- 配信元
- 公開日時
- sentiment
- impact_score
- time_horizon
- AI要約

### 依存Service案

```php
App\Services\News\NewsFeedService
```

### Controller例

```php
namespace App\Http\Controllers;

use App\Services\News\NewsFeedService;
use Illuminate\Http\Request;

class NewsController extends Controller
{
    public function index(Request $request, NewsFeedService $service)
    {
        $news = $service->getFeedForUser(
            user: $request->user(),
            stockId: $request->integer('stock_id') ?: null,
            sentiment: $request->string('sentiment')->toString(),
            period: $request->string('period', '7d')->toString(),
        );

        return view('news.index', [
            'news' => $news,
            'filters' => $request->only(['stock_id', 'sentiment', 'period']),
        ]);
    }
}
```

---

# 4. Service設計

## 4.1 Service一覧

MVPで必要なServiceは以下とする。

| Service | 役割 |
|---|---|
| `DashboardSummaryService` | ダッシュボード用データ集計 |
| `StockSearchService` | 銘柄検索 |
| `StockDetailService` | 銘柄詳細用データ取得 |
| `WatchlistService` | ウォッチリスト追加・更新・削除 |
| `NewsFeedService` | ニュース一覧取得 |
| `StockPriceProviderInterface` | 株価API抽象化 |
| `NewsProviderInterface` | ニュースAPI抽象化 |
| `ArticleAnalyzerInterface` | AI分析基盤抽象化 |
| `StockSignalService` | 銘柄別シグナル生成 |

---

## 4.2 外部API・AI系Service

### StockPriceProviderInterface

```php
namespace App\Services\MarketData\Contracts;

use App\Models\Stock;
use Illuminate\Support\Collection;

interface StockPriceProviderInterface
{
    public function fetchDailyPrices(Stock $stock): Collection;
}
```

### NewsProviderInterface

```php
namespace App\Services\MarketData\Contracts;

use App\Models\Stock;
use Illuminate\Support\Collection;

interface NewsProviderInterface
{
    public function fetchNewsForStock(Stock $stock): Collection;
}
```

### ArticleAnalyzerInterface

```php
namespace App\Services\AI\Contracts;

use App\Models\NewsArticle;
use App\Models\Stock;
use App\Services\AI\Data\ArticleAnalysisData;

interface ArticleAnalyzerInterface
{
    public function analyze(NewsArticle $article, Stock $stock): ArticleAnalysisData;
}
```

### 実装クラス案

```text
App\Services\MarketData\Providers\AlphaVantagePriceProvider
App\Services\MarketData\Providers\AlphaVantageNewsProvider
App\Services\AI\Providers\OpenAiArticleAnalyzer
App\Services\AI\Providers\LocalLlmArticleAnalyzer
```

MVPでは `OpenAiArticleAnalyzer` を利用する。将来的に `LocalLlmArticleAnalyzer` に差し替え可能とする。

---

# 5. Command / Job設計

## 5.1 Command一覧

MVPで用意するArtisan Commandは以下とする。

| Command | 用途 |
|---|---|
| `market:fetch-prices` | ウォッチリスト銘柄の日足株価を取得する |
| `market:fetch-news` | ウォッチリスト銘柄のニュースを取得する |
| `market:analyze-news` | 未分析ニュースをAI分析する |
| `market:generate-signals` | 銘柄別シグナルを生成する |

---

## 5.2 Job一覧

| Job | 用途 |
|---|---|
| `FetchDailyStockPriceJob` | 1銘柄の日足株価を取得・保存する |
| `FetchStockNewsJob` | 1銘柄のニュースを取得・保存する |
| `AnalyzeNewsArticleJob` | 1記事をAI分析し、analysis_resultsへ保存する |
| `GenerateStockSignalJob` | 1銘柄のシグナルを生成・保存する |

---

## 5.3 CommandとJobの関係

```text
market:fetch-prices
  └── FetchDailyStockPriceJob を銘柄ごとにdispatch

market:fetch-news
  └── FetchStockNewsJob を銘柄ごとにdispatch

market:analyze-news
  └── AnalyzeNewsArticleJob を未分析ニュースごとにdispatch

market:generate-signals
  └── GenerateStockSignalJob を銘柄ごとにdispatch
```

---

## 5.4 Scheduler案

```php
use Illuminate\Support\Facades\Schedule;

Schedule::command('market:fetch-prices')->dailyAt('07:00');
Schedule::command('market:fetch-news')->everyThirtyMinutes();
Schedule::command('market:analyze-news')->everyThirtyMinutes();
Schedule::command('market:generate-signals')->hourly();
```

米国市場の取引終了後に日足株価を取得する想定とする。

日本時間では、米国市場の通常取引終了は早朝になるため、MVPでは日本時間 07:00 に日足取得を行う。

---

# 6. View / Blade設計

## 6.1 レイアウト

サイドバー型の共通レイアウトを使用する。

```text
resources/views/layouts/app.blade.php
resources/views/components/sidebar.blade.php
resources/views/components/page-header.blade.php
resources/views/components/flash-message.blade.php
```

---

## 6.2 View一覧

| View | 用途 |
|---|---|
| `dashboard/index.blade.php` | ダッシュボード |
| `stocks/index.blade.php` | 銘柄一覧 |
| `stocks/show.blade.php` | 銘柄詳細 |
| `watchlists/index.blade.php` | ウォッチリスト管理 |
| `news/index.blade.php` | ニュース一覧 |

---

## 6.3 Component案

| Component | 用途 |
|---|---|
| `stock-signal-badge` | シグナルスコア表示 |
| `sentiment-badge` | positive / neutral / negative 表示 |
| `impact-score-badge` | impact_score表示 |
| `stock-table` | 銘柄一覧テーブル |
| `news-card` | ニュースカード |
| `summary-card` | ダッシュボード集計カード |

---

# 7. FormRequest設計

## 7.1 Request一覧

| Request | 用途 |
|---|---|
| `StoreWatchlistRequest` | ウォッチリスト追加 |
| `UpdateWatchlistRequest` | ウォッチリスト更新 |
| `StockSearchRequest` | 銘柄検索。MVPではRequest化しなくてもよい |
| `NewsFilterRequest` | ニュースフィルタ。MVPではRequest化しなくてもよい |

---

## 7.2 StoreWatchlistRequest

```php
public function rules(): array
{
    return [
        'stock_id' => ['required', 'integer', 'exists:stocks,id'],
        'priority' => ['nullable', 'in:low,medium,high'],
        'memo' => ['nullable', 'string', 'max:1000'],
    ];
}
```

---

## 7.3 UpdateWatchlistRequest

```php
public function rules(): array
{
    return [
        'priority' => ['required', 'in:low,medium,high'],
        'memo' => ['nullable', 'string', 'max:1000'],
    ];
}
```

---

# 8. Policy設計

## 8.1 WatchlistPolicy

ウォッチリストは所有ユーザーのみ更新・削除できる。

```php
namespace App\Policies;

use App\Models\User;
use App\Models\Watchlist;

class WatchlistPolicy
{
    public function update(User $user, Watchlist $watchlist): bool
    {
        return $watchlist->user_id === $user->id;
    }

    public function delete(User $user, Watchlist $watchlist): bool
    {
        return $watchlist->user_id === $user->id;
    }
}
```

---

# 9. 実装タスク分解

## Phase 0: プロジェクト初期化

### 目的

Laravelプロジェクトの土台を作る。

### タスク

- [ ] Laravelプロジェクト作成
- [ ] `.env` 設定
- [ ] DB接続設定
- [ ] Laravel Breeze導入
- [ ] Tailwind / DaisyUI設定
- [ ] 認証画面確認
- [ ] Git初期化
- [ ] README作成

### 完了条件

- ログイン・ログアウトができる。
- `/dashboard` にアクセスできる。
- 共通レイアウトが表示される。

---

## Phase 1: DB・Model実装

### 目的

MVPに必要なデータ構造を作る。

### タスク

- [ ] `stocks` migration作成
- [ ] `watchlists` migration作成
- [ ] `stock_prices` migration作成
- [ ] `news_articles` migration作成
- [ ] `stock_news` migration作成
- [ ] `analysis_results` migration作成
- [ ] `stock_signals` migration作成
- [ ] Model作成
- [ ] Eloquentリレーション定義
- [ ] Factory作成
- [ ] Seeder作成
- [ ] 主要銘柄Seeder作成

### Model一覧

- [ ] `Stock`
- [ ] `Watchlist`
- [ ] `StockPrice`
- [ ] `NewsArticle`
- [ ] `AnalysisResult`
- [ ] `StockSignal`

### 完了条件

- `php artisan migrate:fresh --seed` が成功する。
- 主要銘柄がDBに登録される。
- UserからWatchlist、Stockへアクセスできる。

---

## Phase 2: 共通レイアウト・ナビゲーション

### 目的

Notion / 管理画面風のUI基盤を作る。

### タスク

- [ ] `layouts/app.blade.php` 作成
- [ ] Sidebar component作成
- [ ] Page header component作成
- [ ] Flash message component作成
- [ ] Dashboard / Stocks / Watchlist / News のナビゲーション追加
- [ ] ログアウト導線追加

### 完了条件

- 認証後画面でサイドバーが表示される。
- 各画面へ遷移できる。

---

## Phase 3: ウォッチリスト機能

### 目的

監視銘柄を管理できるようにする。

### タスク

- [ ] `WatchlistController` 作成
- [ ] `WatchlistService` 作成
- [ ] `StoreWatchlistRequest` 作成
- [ ] `UpdateWatchlistRequest` 作成
- [ ] `WatchlistPolicy` 作成
- [ ] `/watchlists` 一覧画面作成
- [ ] 追加処理実装
- [ ] priority更新処理実装
- [ ] memo更新処理実装
- [ ] 削除処理実装
- [ ] Feature Test作成

### 完了条件

- 銘柄をウォッチリストに追加できる。
- priorityとmemoを更新できる。
- 自分のウォッチリストだけ削除できる。

---

## Phase 4: 銘柄一覧・銘柄詳細

### 目的

銘柄検索と銘柄詳細表示を実装する。

### タスク

- [ ] `StockController` 作成
- [ ] `StockSearchService` 作成
- [ ] `StockDetailService` 作成
- [ ] `/stocks` 一覧画面作成
- [ ] symbol / name検索実装
- [ ] marketフィルタ実装
- [ ] ウォッチリスト追加ボタン設置
- [ ] `/stocks/{symbol}` 詳細画面作成
- [ ] 最新株価表示
- [ ] シグナル表示
- [ ] AI分析サマリー表示
- [ ] 関連ニュース表示
- [ ] 日足チャート枠作成
- [ ] Feature Test作成

### 完了条件

- 銘柄一覧を検索できる。
- 銘柄詳細画面を表示できる。
- 銘柄詳細に関連ニュース・分析結果・シグナルが表示される。

---

## Phase 5: ニュース一覧

### 目的

ウォッチリスト銘柄関連ニュースを横断的に表示する。

### タスク

- [ ] `NewsController` 作成
- [ ] `NewsFeedService` 作成
- [ ] `/news` 画面作成
- [ ] 銘柄フィルタ実装
- [ ] sentimentフィルタ実装
- [ ] 期間フィルタ実装
- [ ] ニュースカードcomponent作成
- [ ] Feature Test作成

### 完了条件

- ウォッチリスト関連ニュースを一覧表示できる。
- 銘柄、sentiment、期間でフィルタできる。

---

## Phase 6: ダッシュボード

### 目的

アプリ起動時に見るべき情報を集約する。

### タスク

- [ ] `DashboardController` 作成
- [ ] `DashboardSummaryService` 作成
- [ ] 集計カード作成
- [ ] 注目銘柄ランキング作成
- [ ] 重要ニュース一覧作成
- [ ] 最新分析日時表示
- [ ] Feature Test作成

### 完了条件

- ウォッチリスト全体の状況を確認できる。
- 注目銘柄ランキングが表示される。
- 重要ニュースが表示される。

---

## Phase 7: 株価取得バッチ

### 目的

日足株価を取得してDB保存する。

### タスク

- [ ] `StockPriceProviderInterface` 作成
- [ ] `AlphaVantagePriceProvider` 作成
- [ ] `FetchDailyStockPriceJob` 作成
- [ ] `market:fetch-prices` Command作成
- [ ] Scheduler登録
- [ ] 取得済みデータの重複排除
- [ ] 失敗時ログ出力
- [ ] Unit Test作成

### 完了条件

- ウォッチリスト銘柄の日足株価を取得できる。
- `stock_prices` に重複なく保存できる。

---

## Phase 8: ニュース取得バッチ

### 目的

ウォッチリスト銘柄のニュースを取得してDB保存する。

### タスク

- [ ] `NewsProviderInterface` 作成
- [ ] `AlphaVantageNewsProvider` 作成
- [ ] `FetchStockNewsJob` 作成
- [ ] `market:fetch-news` Command作成
- [ ] Scheduler登録
- [ ] URL / hashによる重複排除
- [ ] stock_news紐付け処理
- [ ] Unit Test作成

### 完了条件

- ウォッチリスト銘柄のニュースを取得できる。
- `news_articles` と `stock_news` に保存できる。

---

## Phase 9: AI分析

### 目的

取得済みニュースをAIで要約・分類・スコアリングする。

### タスク

- [ ] `ArticleAnalyzerInterface` 作成
- [ ] `ArticleAnalysisData` DTO作成
- [ ] `OpenAiArticleAnalyzer` 作成
- [ ] `AnalyzeNewsArticleJob` 作成
- [ ] `market:analyze-news` Command作成
- [ ] JSON Schema定義
- [ ] prompt version管理
- [ ] analysis_results保存処理
- [ ] 不正JSON / タイムアウト時のエラーハンドリング
- [ ] Unit Test作成

### 完了条件

- 未分析ニュースをAI分析できる。
- summary、sentiment、impact_score、confidence_score、reasonを保存できる。
- 分析結果が画面に表示される。

---

## Phase 10: シグナル生成

### 目的

銘柄単位のシグナルスコアを生成する。

### タスク

- [ ] `StockSignalService` 作成
- [ ] `GenerateStockSignalJob` 作成
- [ ] `market:generate-signals` Command作成
- [ ] 直近ニューススコア集計
- [ ] `stock_signals` 保存処理
- [ ] ダッシュボードへの反映
- [ ] 銘柄詳細への反映
- [ ] Unit Test作成

### MVPの計算式

```text
total_score = 直近7日間のimpact_score加重平均
```

### 完了条件

- 銘柄ごとのシグナルスコアを生成できる。
- ダッシュボードと銘柄詳細に表示できる。

---

# 10. 実装順序の推奨

MVPを最短で動かす場合、以下の順序で進める。

```text
1. Laravel初期構築 + Breeze
2. DB / Model / Seeder
3. 共通レイアウト
4. Watchlist
5. Stocks
6. News画面
7. Dashboard
8. 株価取得
9. ニュース取得
10. AI分析
11. シグナル生成
```

画面を先に作り、外部APIやAI分析は後から差し込む方が開発しやすい。

---

# 11. Codex Appに依頼しやすいタスク単位

Codex Appには、以下のように小さく区切って依頼する。

## 11.1 DB実装

```text
DB設計書をもとに、Laravelのmigration、Model、Factory、Seederを作成してください。
Eloquentリレーションも定義してください。
MVP対象テーブルのみ実装してください。
```

## 11.2 Watchlist実装

```text
WatchlistController、WatchlistService、StoreWatchlistRequest、UpdateWatchlistRequest、WatchlistPolicyを作成してください。
認証ユーザー本人のwatchlistのみ更新・削除できるようにしてください。
Feature Testも作成してください。
```

## 11.3 Stock画面実装

```text
StockController、StockSearchService、StockDetailServiceを作成してください。
/stocks で銘柄検索、/stocks/{symbol} で銘柄詳細を表示できるようにしてください。
BladeはTailwind/DaisyUIでNotion風の管理画面UIにしてください。
```

## 11.4 News画面実装

```text
NewsControllerとNewsFeedServiceを作成してください。
/news でウォッチリスト銘柄に関連するニュースを表示し、銘柄、sentiment、期間でフィルタできるようにしてください。
```

## 11.5 AI分析実装

```text
ArticleAnalyzerInterface、OpenAiArticleAnalyzer、AnalyzeNewsArticleJob、market:analyze-news Commandを実装してください。
OpenAI APIのレスポンスはJSON Schemaに従ってパースし、analysis_resultsに保存してください。
不正JSON、APIエラー、タイムアウト時はfailed_jobsとログに記録してください。
```

---

# 12. MVP完了条件

MVP完了条件は以下とする。

- [ ] ログインできる。
- [ ] 銘柄マスタが登録されている。
- [ ] 銘柄をウォッチリストに追加できる。
- [ ] ウォッチリストのpriority / memoを編集できる。
- [ ] 銘柄一覧を検索できる。
- [ ] 銘柄詳細を表示できる。
- [ ] ウォッチリスト関連ニュースを表示できる。
- [ ] ニュースをAI分析できる。
- [ ] AI分析結果をDB保存できる。
- [ ] 銘柄ごとのシグナルスコアを生成できる。
- [ ] ダッシュボードに注目銘柄と重要ニュースを表示できる。

---

# 13. MVP対象外として明記すること

以下はMVP対象外とする。

- 保有株管理
- 損益管理
- ポートフォリオ管理
- 自動売買
- 証券会社API連携
- リアルタイム株価
- 分足チャート
- アラート通知
- メール通知
- LINE通知
- 管理者画面
- 課金機能
- 複数ユーザー向け権限管理
- 売買推奨の断定表示

---

# 14. 注意表示

画面フッターまたはダッシュボード下部に、以下の注意文言を表示する。

```text
本サービスは投資判断を補助するための情報整理を目的としており、特定の金融商品の売買を推奨するものではありません。
表示される分析結果やスコアは、取得した情報をもとに機械的に算出された参考情報であり、将来の株価を保証するものではありません。
投資判断は利用者自身の責任において行ってください。
```

---

# 15. 次工程

本ドキュメントの次工程は以下とする。

1. Migration詳細設計
2. Model / Relation詳細設計
3. Bladeコンポーネント設計
4. Serviceクラス詳細設計
5. AI分析JSON Schema設計
6. Codex App投入用タスク分解
