# Stock Analysis Implementation Status

作成日: 2026-06-15

## 確認対象

- 仕様・設計: `docs/app/要件定義書.md`
- 仕様・設計: `docs/app/stock_analysis_laravel_db_design.md`
- 仕様・設計: `docs/app/stock_analysis_laravel_implementation_plan.md`
- 仕様・設計: `docs/app/stock_analysis_laravel_screen_design.md`
- 実装: `app/`
- 実装: `resources/js/`
- 実装: `routes/`
- 実装: `database/`
- 実装: `tests/`

## 前提メモ

設計書の一部は Blade ベースの実装を前提としているが、現在のソースコードは Laravel + Inertia.js + React で実装されている。

また、画面設計書・実装計画では Alerts は MVP 対象外としている一方、要件定義書と DB 設計ではアラート関連テーブル・要件が含まれている。本メモでは、画面設計書・実装計画の MVP 画面を主軸に整理する。

## Frontend

### 実装済み

- 認証画面
  - ログイン画面
  - 新規登録画面
  - メール認証待ち画面
- 共通レイアウト
  - 認証後レイアウト
  - サイドナビゲーション
  - トップナビゲーション
  - 投資助言ではない旨の注意表示
- Stocks 画面
  - 銘柄コード・企業名検索フォーム
  - 市場フィルタ
  - 銘柄一覧テーブル
  - 銘柄詳細への遷移
  - 該当なしの空状態表示
- Stock Detail 画面
  - 銘柄基本情報
  - 最新価格
  - 出来高
  - 期間騰落
  - 価格履歴チャート
  - 価格履歴テーブル
  - 期間切り替え

### 部分実装

- Dashboard 画面
  - 画面とコンポーネントは存在する。
  - 表示データはモックであり、ウォッチリスト・ニュース・シグナル等の実データ集計には接続されていない。
- Stock Detail 画面
  - 株価・企業情報の表示は実装済み。
  - AI分析、シグナル、材料、関連ニュース表示は未実装。

### 未実装

- Stocks 画面
  - ウォッチリスト追加ボタン
  - ウォッチリスト登録済み状態の表示
- Watchlist 画面
  - 現状はプレースホルダー。
  - 監視銘柄一覧
  - priority 表示・変更
  - memo 表示・編集
  - 削除
  - 銘柄詳細への遷移
- News 画面
  - 現状はプレースホルダー。
  - ニュース一覧
  - 銘柄フィルタ
  - sentiment フィルタ
  - 期間フィルタ
  - AI要約表示
  - impact_score 表示
  - 元記事URLへの導線
- Dashboard 画面
  - ウォッチリスト銘柄数
  - 直近ポジティブ材料数
  - 直近ネガティブ材料数
  - 未分析ニュース数
  - 注目銘柄ランキング
  - 重要ニュース一覧
  - 最新分析日時
- Stock Detail 画面
  - シグナルスコア
  - AI分析サマリー
  - ポジティブ材料
  - ネガティブ材料
  - 関連ニュース
  - ユーザーメモ
  - アラート導線

## Backend

### 実装済み

- 認証
  - ユーザー登録
  - ログイン
  - ログアウト
  - メール認証
  - FormRequest による認証系バリデーション
  - 認証系 UseCase
- DB 基盤
  - `stocks`
  - `watchlists`
  - `stock_prices`
  - `news_articles`
  - `stock_news`
  - `analysis_results`
  - `stock_signals`
  - `alerts`
  - `alert_logs`
- Eloquent Model / Relation
  - `User`
  - `Stock`
  - `Watchlist`
  - `StockPrice`
  - `NewsArticle`
  - `AnalysisResult`
  - `StockSignal`
  - `Alert`
  - `AlertLog`
- 銘柄マスタ
  - 主要銘柄 Seeder
  - Factory
  - `market + symbol` の一意制約
- 銘柄一覧・詳細
  - `StocksPageController`
  - `StockIndexRequest`
  - `StockShowRequest`
  - `ListStocksUseCase`
  - `ShowStockUseCase`
  - `StockRepositoryInterface`
  - `StockRepository`
  - 銘柄コード・企業名検索
  - 市場フィルタ
  - 最新株価取得
  - 指定期間の価格履歴取得
- Watchlist Backend
  - `WatchlistPageController` の一覧・追加・更新・停止 action
  - `StoreWatchlistRequest`
  - `UpdateWatchlistRequest`
  - `WatchlistPolicy`
  - Watchlist 用 Data / UseCase / Repository
  - 自分のウォッチリストだけ更新・停止できる認可
- テスト
  - 認証系 Feature / UseCase / Data テスト
  - メール認証 Feature テスト
  - Stock 画面 Feature テスト
  - 株式分析系 Model relation テスト
  - Watchlist Web Controller / UseCase テスト

### 部分実装

- Watchlist
  - DB、Model、Factory、Relation は存在する。
  - Inertia 向けの一覧 props と追加・更新・停止 action は実装済み。
  - フロントエンド画面はまだプレースホルダーであり、一覧表示・編集フォーム・削除操作は未接続。
- News
  - DB、Model、Factory、Relation は存在する。
  - ニュース取得、一覧表示、フィルタ、AI分析結果との結合取得は未実装。
- AnalysisResult / StockSignal
  - DB、Model、Factory、Enum は存在する。
  - 生成処理、集計処理、画面向け取得処理は未実装。
- Alert
  - DB、Model、Factory、Enum は存在する。
  - アラート作成・停止・削除・発火・履歴表示は未実装。

### 未実装

- パスワードリセット
- プロフィール編集
- Watchlist 機能
  - フロントエンドの監視銘柄一覧表示
  - priority 表示・変更 UI
  - memo 表示・編集 UI
  - 削除 UI
  - Stocks 画面からの追加 UI
- Dashboard 集計
  - Dashboard 用 UseCase / Service
  - ウォッチリスト集計
  - 注目銘柄ランキング
  - 重要ニュース取得
  - 最新分析日時取得
- News 一覧
  - News 用 UseCase / Service
  - ウォッチリスト関連ニュース取得
  - 銘柄フィルタ
  - sentiment フィルタ
  - 期間フィルタ
  - Feature Test
- 株価取得バッチ
  - `StockPriceProviderInterface`
  - 外部株価 API Provider
  - `FetchDailyStockPriceJob`
  - `market:fetch-prices` Command
  - Scheduler 登録
  - 重複排除
  - 失敗時ログ
  - Unit Test
- ニュース取得バッチ
  - `NewsProviderInterface`
  - 外部ニュース API Provider
  - `FetchStockNewsJob`
  - `market:fetch-news` Command
  - Scheduler 登録
  - URL / content_hash による重複排除
  - `stock_news` 紐付け処理
  - Unit Test
- AI分析
  - `ArticleAnalyzerInterface`
  - 外部 LLM Provider
  - 分析結果 DTO
  - `AnalyzeNewsArticleJob`
  - `market:analyze-news` Command
  - `analysis_results` 保存処理
  - Unit Test
- シグナル生成
  - `StockSignalService`
  - `GenerateStockSignalJob`
  - `market:generate-signals` Command
  - `stock_signals` 保存処理
  - Unit Test
- アラート機能
  - アラート条件 CRUD
  - アラート評価処理
  - アラート発火履歴作成
  - 未読・既読管理
  - 画面向け取得処理

## ルート差分

設計書と現在実装には以下の差分がある。

| 項目 | 設計書 | 実装 |
|---|---|---|
| ホーム | `/` から `/dashboard` へリダイレクト | `/` は `welcome` view |
| 銘柄詳細 | `/stocks/{symbol}` | `/stocks/{stock}` の数値ID |
| ウォッチリスト | `/watchlists` | `/watchlist` |
| 主要画面 middleware | `auth` | `auth`, `verified`, `precognitive` |

## 優先度案

1. 設計とルートの差分を決める
   - `/watchlists` に寄せるか、現状の `/watchlist` を正とするか。
   - `/stocks/{symbol}` に寄せるか、ID ベースを正とするか。
2. Watchlist CRUD を実装する
   - Stocks から追加できるようにする。
   - Watchlist で priority / memo / remove を扱う。
3. News 一覧を DB データから表示する
   - 取得バッチ前でも Seeder / Factory データで画面を成立させる。
4. Stock Detail に関連ニュース・分析結果・シグナルを接続する
5. Dashboard を実データ集計に置き換える
6. 株価取得、ニュース取得、AI分析、シグナル生成のバッチ系を実装する
