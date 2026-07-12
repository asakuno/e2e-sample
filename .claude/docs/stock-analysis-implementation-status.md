# Stock Analysis Implementation Status

作成日: 2026-06-15

最終更新日: 2026-07-12
確認ブランチ: `codex/stock-analysis-implementation`（`develop` から作成）

## 結論

株式分析アプリの **MVP はコードと自動テストの範囲では実装完了** と判定する。

旧版で「実装済み」とされていた箇所は実データの対象範囲・表示内容・鮮度の扱いまで再監査し、不足していたバックエンド処理を先に、その後フロントエンドを補完した。実装計画の「MVP完了条件」はすべて満たしている。

ただし、次の理由により **外部サービスを含む本番相当の運用確認は未完了** である。

- ローカル `.env` に Alpha Vantage / OpenAI の実APIキーが設定されていない。
- 外部APIへのライブ疎通、実データ取得、実課金・クォータ環境での連続運転は未確認である。
- queue worker / scheduler は構成済みだが、APIキー設定後にサービスを再作成して稼働確認する必要がある。
- `npm audit` で既存依存関係の脆弱性3件が検出されている。依存更新は承認が必要なため、この変更には含めていない。

外部API部分は HTTP モックを使った自動テストで、正常系、APIエラー、不正レスポンス、タイムアウト相当、冪等保存を検証している。

## 判定範囲

- 要件: `docs/app/要件定義書.md`
- DB設計: `docs/app/stock_analysis_laravel_db_design.md`
- 実装計画: `docs/app/stock_analysis_laravel_implementation_plan.md`
- 画面設計: `docs/app/stock_analysis_laravel_screen_design.md`
- 実装: `app/`, `resources/js/`, `routes/`, `database/`, `tests/`

画面設計の Blade 前提は、現行構成に合わせて Laravel 12 + Inertia.js v2 + React 19 で実現している。Alerts、Settings / Profile、通知は実装計画と画面設計の定義どおり MVP 対象外とした。

## MVP完了条件

| 完了条件 | 判定 | 主な根拠 |
|---|---|---|
| ログインできる | 完了 | 登録、ログイン、ログアウト、メール認証、Feature / Unit テスト |
| 銘柄マスタが登録されている | 完了 | Stock Seeder / Factory、`market + symbol` 一意制約、provider symbolの明示マッピング |
| 銘柄をウォッチリストに追加できる | 完了 | Controller / Request / Policy / UseCase / Repository / UI |
| priority / memo を編集できる | 完了 | 一覧と銘柄詳細の両方から編集可能、認可テスト済み |
| 銘柄一覧を検索できる | 完了 | symbol / name 検索、市場フィルタ、ページネーション |
| 銘柄詳細を表示できる | 完了 | 調整後終値優先の株価・騰落率、日足・出来高チャート、実データ範囲に応じた期間切替 |
| ウォッチリスト関連ニュースを表示できる | 完了 | ユーザーの有効なウォッチリスト銘柄だけに限定 |
| ニュースをAI分析できる | 完了 | OpenAI Responses API + Structured Outputs、ジョブ・コマンド |
| AI分析結果をDB保存できる | 完了 | article × stock × prompt version 単位の冪等保存 |
| 銘柄ごとのシグナルを生成できる | 完了 | 直近168時間のニュース分析から生成、prompt version単位の冪等保存 |
| 注目銘柄と重要ニュースを表示できる | 完了 | ユーザー単位の最新シグナル・重要ニュース集計 |

画面設計で必須とされるパスワードリセットも実装済みである。メールアドレスの存在をレスポンスから判別できないようにしている。

## 今回の再監査で修正した旧判定

旧版の「画面が存在するため完了」という判定では不十分だったため、次を修正した。

| 項目 | 旧実装の不足 | 現在の状態 |
|---|---|---|
| News | 全ユーザー共通のニュースが混在し得た | ログインユーザーの有効なウォッチリスト関連だけに限定 |
| AI分析表示 | summary / sentiment / impact の一部だけ | confidence、時間軸、材料、リスク、判断理由まで表示 |
| Dashboard | 古いシグナルや価格鮮度が曖昧 | 銘柄ごとの最新シグナル、最新価格、前日比、更新時刻を表示 |
| Stock Detail | 材料とユーザーメモが不足 | ポジティブ・ネガティブ材料、リスク、メモ追加・編集を実装 |
| データパイプライン | DBと表示側だけ存在 | 株価、ニュース、AI分析、シグナルの取得・生成処理を実装 |
| 認証 | パスワードリセット未実装 | リセットリンク送信・再設定画面・UseCaseを実装 |
| ルート | `/`, `/watchlist` が設計と不一致 | `/` は Dashboard、`/watchlists` を正規URLに統一 |
| E2E | 未実装 | 認証セットアップと Stocks 検索→詳細の実ブラウザテストを追加 |

## コードレビュー指摘への対応

| 指摘 | 対応後の状態 |
|---|---|
| compact取得と100データポイントを超える期間選択 | DBの最古・最新価格日で利用可能期間を判定し、不足期間は無効化。URLで指定されても安全な期間へ戻して注意を表示 |
| UTCのオフセット消失 | DB / Laravel内部はUTCを維持し、Inertia propsはUTC ISO 8601で返却。UIは `Asia/Tokyo` で表示 |
| News検索とDashboard日別集計のUTC日付ずれ | JSTの日付境界をUTC半開区間へ変換。DashboardはDB固有のタイムゾーン関数を使わずJST日付へ分類 |
| Stock Detailの通常終値固定 | `effective_close = adjusted_close ?? close` をDTOで定義し、最新価格、前日比、期間騰落、チャート、履歴表で統一 |
| stock_signalsにprompt versionがない | `prompt_version` を保存し、`stock_id + signal_date + prompt_version` で一意化。Dashboard / Stock Detailは現行versionだけを取得 |
| 外部APIへ内部symbolを直接送信 | `stock_provider_symbols` で明示的に分離し、マッピング未登録銘柄はAPI呼び出し・Job投入の対象外 |
| 1件の不正ニュースでfeed全体を破棄 | 個別記事の不正はindex・provider symbol・理由をwarningログに残してskip。正常記事は保存し、非空feedが全件不正な場合は通信障害と区別してJobを即時fail |
| ニュース取得頻度の計画と実装の不一致 | 無料枠の既定は毎日07:30 JSTに統一。Premium等は `ALPHA_VANTAGE_NEWS_CRON` で変更可能と計画書・設定例に明記 |

## Backend

### 認証・認可

- 登録、ログイン、ログアウト、メール認証、パスワードリセット
- メール認証URLの id と email hash の検証
- Form Request、UseCase、Policy によるバリデーション・認可
- 認証後の主要画面は `auth`, `verified`, `precognitive` を適用

### 株価・ニュース取り込み

- `StockPriceProviderInterface` / `NewsProviderInterface`
- Alpha Vantage 株価・ニュース Provider
- `stock_provider_symbols` の明示マッピングがある銘柄だけを取得対象に限定
- `FetchDailyStockPriceJob` / `FetchStockNewsJob`
- `market:fetch-prices` / `market:fetch-news`
- 株価は stock + price date、ニュースは URL / content hash で重複を防止
- `news_articles` と `stock_news` を冪等に保存
- APIエラー、不正JSON、通信失敗はキュー再試行対象。feed内の個別不正記事はwarningログ付きでskip
- 元記事URLはHTTP / HTTPSだけを受け付け、全件不正feedは決定的なデータ不正として無駄に再取得しない
- Alpha Vantage の分単位・日単位の共有レート制限を設定可能

`ALPHA_VANTAGE_PRICE_FUNCTION` の初期値は `TIME_SERIES_DAILY`、`ALPHA_VANTAGE_PRICE_OUTPUT_SIZE` は `compact` である。この設定では `adjusted_close` は `null` になり、画面は通常の終値へフォールバックする。調整後終値が必要な環境では `TIME_SERIES_DAILY_ADJUSTED` に切り替える。期間選択はAPI設定値ではなく、実際にDBへ保存された最古・最新日で判定する。

### AI分析・シグナル

- `ArticleAnalyzerInterface` / `OpenAiArticleAnalyzer`
- OpenAI Responses API の Structured Outputs で出力形式を固定
- summary、sentiment、impact / confidence score、time horizon、positive / negative factors、risk points、reason を保存
- `AnalyzeNewsArticleJob` / `market:analyze-news`
- `StockSignalService` / `GenerateStockSignalJob` / `market:generate-signals`
- 分析とシグナル用の専用キュー・レート制限
- 分析結果と生成シグナルの両方をprompt versionごとに保存でき、表示・集計・シグナル生成では現行versionだけを使用
- シグナルは記事の `published_at` を基準に直近168時間を集計し、分析実行時刻による期間ずれを防止

### Dashboard / Stocks / Watchlist / News

- Controller は Request / UseCase / Resource を中心に薄く維持
- Repository Interface 経由のデータアクセス
- Dashboard はユーザー単位の集計、現行prompt versionの最新シグナル、JST基準の7日トレンド、最新価格を使用
- News はウォッチリスト所有者でスコープし、銘柄・sentiment・JST日付範囲・article ID を検証して絞り込み
- Stock Detail は現行 prompt version の関連ニュース・分析だけを取得
- Stocks 25件、News 20件、Watchlist 20件でページネーション

### スケジュールとキュー

| 処理 | 初期スケジュール | キュー |
|---|---|---|
| 株価取得 | 毎日 07:00 JST | `market-data` |
| ニュース取得 | 毎日 07:30 JST | `market-data` |
| AI分析登録 | 30分ごと | `ai-analysis` |
| シグナル生成 | 1時間ごと | `signals` |

株価・ニュースの cron、タイムゾーン、APIレートは環境変数で変更できる。ニュース取得は Alpha Vantage 無料枠のクォータを考慮して日次を既定とし、Premium契約等で十分なクォータがある環境では `ALPHA_VANTAGE_NEWS_CRON` で高頻度化できる。AI分析登録は30分ごとに未分析記事を探すが、既定設定の新規ニュース鮮度は1日1回である。スケジュールは重複実行を防ぎ、単一サーバー実行用ロックを使用する。

## Frontend

- Dashboard
  - 統計カード、7日トレンド、注目銘柄、重要ニュース、分析鮮度
  - 最新価格、前日比、シグナル内訳、sentiment、材料件数
  - 銘柄詳細・ニュースへの Inertia 導線
- Stocks
  - symbol / name 検索、市場フィルタ、ページネーション
  - ウォッチリスト登録状態と追加操作
- Stock Detail
  - 銘柄情報、最新価格、前日比、価格取得日、出来高
  - シグナル → AI分析・材料・リスク → 関連ニュース → チャート・履歴の優先順
  - 調整後終値優先の日足と出来高、データ範囲に応じた期間切替・履歴不足表示
  - ウォッチリスト追加、メモ編集、関連ニュース・元記事への導線
- Watchlist
  - priority / memo の表示・編集、削除、ページネーション
- News
  - 銘柄、sentiment、期間フィルタ、ページネーション
  - AI要約、時間軸、材料、リスク、判断理由、分析日時
  - 銘柄詳細と元記事への導線
- Auth / 共通
  - UTC ISO 8601で受け取った時刻を `Asia/Tokyo` で共通表示
  - パスワード再設定画面
  - success / error フラッシュメッセージ
  - 投資助言ではない旨の注意表示

## ルート方針

| 項目 | 現在の実装 | 判断理由 |
|---|---|---|
| ホーム | `/` → `/dashboard` | 設計書に合わせた |
| 銘柄詳細 | `/stocks/{stock}`（数値ID） | symbol は market 内でのみ一意のため、曖昧性のないIDを維持 |
| ウォッチリスト | `/watchlists` | 設計書に合わせ、旧 `/watchlist` はリダイレクト |
| News | `/news` | ユーザーのウォッチリストでスコープ |
| middleware | `auth`, `verified`, `precognitive` | 現行アプリのセキュリティ方針を維持 |

## Laravel Simplifier による責務レビュー

公式の [`laravel-simplifier`](https://github.com/laravel/agent-skills/blob/main/laravel/agents/laravel-simplifier.md) の方針と、このプロジェクトの7層アーキテクチャ規約を使い、`develop` との差分に含まれる PHP / Laravel コードを専用サブエージェントで再レビューした。

P0 / P1 相当の動作、データ破壊、セキュリティ上の重大な指摘はなかった。挙動を維持したまま、次の責務分離・簡素化を反映した。

- `AuthPageController` からパスワード再設定の4 action と2 UseCase依存を `PasswordResetPageController` へ分離
- `GetDashboardSummaryUseCase` から DTO 組み立て、株価・トレンド・表示派生値の整形を `DashboardSummaryAssembler` へ分離
- `OpenAiArticleAnalyzer` から応答探索、JSON / schema検証、型変換、DTO生成を `OpenAiArticleAnalysisResponseParser` へ分離
- Dashboard の最新シグナル window query を共通化し、ウォッチリスト銘柄IDを先行取得せず subquery で絞り込むように変更
- OpenAI の schema properties、required fields、parserのfield検証を単一定義から生成し、契約のずれを防止
- `ShowStockUseCase` から価格期間の利用可否・fallback・注意文生成を `StockPricePeriodAvailabilityService` とtyped Dataへ分離
- 空白provider symbolの除外、全件不正feedの即時fail、HTTP(S) URL制限を追加し、決定的な入力不正での無駄なJob再試行を防止

次は現時点では過剰抽象化になるため見送った。

| 候補 | 判断 |
|---|---|
| `AppServiceProvider` の追加分を別 ServiceProvider へ分離 | 現在はすべてサービス登録とRateLimiter設定の責務内。外部連携がさらに増えた時点で再検討する |
| Alpha Vantage 2 Provider のHTTP client共通化 | 2 endpointだけの段階では個別Providerの明示性を優先。3つ目のendpoint追加やエラー処理変更時に抽出する |
| Job / Command の基底クラス化 | 形は似ているが各処理のキュー、rate limit、再試行条件が明確であり、基底化は追跡しにくくなるため行わない |

## 自動検証結果

2026-07-12 時点の結果:

- PHPUnit: **239 tests / 1240 assertions passed**
- Vitest: **53 files / 295 tests passed**
- Playwright: **2 tests passed**（認証セットアップ + Stocks 検索から詳細表示）
- PHPStan: passed
- Pint: passed
- Deptrac: 0 violations / 0 warnings / 0 errors
- TypeScript typecheck: passed
- frontend lint / format check: passed
- production / SSR build: passed
- `docker compose config --quiet`: passed
- MySQL migration / MajorStockSeeder: passed
- `php artisan schedule:list`: passed
- `composer audit`: 脆弱性なし
- `npm audit`: **3 vulnerabilities**（production: high 1件、dev依存を含む全体: high 1件 / critical 2件）

CI には SQLite の分離DBを作成し、migrate / seed / build 後に Playwright を実行する E2E ジョブを追加した。失敗時は Playwright のレポートと実行成果物を保存する。

`npm run test:coverage` は、既存の `@vitest/coverage-v8` が依存関係に含まれていないため未実行である。今回の依頼には依存追加の承認がないため追加していない。通常の全 Vitest は完走している。

## 運用開始前に残る確認

次はコードの未実装ではなく、資格情報と外部環境を必要とする運用受け入れ項目である。

1. `.env` に `ALPHA_VANTAGE_API_KEY` と `OPENAI_API_KEY` を設定する。
2. 必要なら利用プランに合わせて APIレート、cron、モデル、price function を調整する。
3. 公式のSymbol Search等で確認した銘柄だけを `stock_provider_symbols` へ登録する。現在のSeederは米国株6銘柄のみをAlpha Vantage対応済みとし、日本株の suffix は推測しない。
4. DB migration / seed を適用し、`legacy` 扱いになる既存シグナルは現行prompt versionで再生成する。
5. `docker compose up -d --build queue_worker scheduler` でサービスを再作成する。
6. `php artisan schedule:list` と `php artisan queue:monitor`、ログで稼働を確認する。
7. 少数銘柄で株価取得 → ニュース取得 → AI分析 → シグナル生成を順にライブ実行し、APIクォータと費用を確認する。

## 承認待ちの依存更新

`npm audit` は次を報告している。いずれも今回の実装で追加した依存ではない。

- `axios -> form-data@4.0.5`: high 1件（production dependency）
- `concurrently -> shell-quote@1.8.3`: critical 2件（development dependency）

リポジトリ方針により依存更新には明示承認が必要なため、`npm audit fix` は実行していない。

現時点のローカル環境では `queue_worker` は、MySQL起動前の接続失敗で終了した旧コンテナのままで、`scheduler` コンテナはまだ作成されていない。更新後の compose では MySQL healthcheck 待機と `restart: unless-stopped` を設定済みだが、APIキー設定後に上記コマンドで再作成する必要がある。

ローカル Docker の E2E は Seeder の `test@example.com` を使用する。CI は毎回分離した SQLite DB を初期化するため、既存の開発データには依存しない。

## MVP対象外・後続候補

- Alerts の条件CRUD、評価、通知、履歴、未読管理
- Settings / Profile 画面
- 保有株、損益、ポートフォリオ、自動売買、証券会社API連携
- リアルタイム株価、分足チャート
- SEC / EDGAR 等の開示連携と disclosure / macro score の独立計算
- 銘柄全体を別処理で再要約する統合サマリー（現状は記事×銘柄の直近分析カードとシグナル理由を表示）
- impact / source / time horizon などの追加フィルタ
- E2E の認証、Watchlist、News、バッチ連携シナリオ拡充

これらは今回確認した MVP 完了条件には含まれない。
