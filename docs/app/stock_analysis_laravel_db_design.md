# 株式投資支援Laravelアプリ DB設計書

## 1. 前提

本DB設計は、株式投資支援LaravelアプリのMVPを対象とする。

本アプリは、ユーザーの保有株数、取得単価、損益、ポートフォリオを管理しない。
ユーザーが関心のある銘柄をウォッチリストに登録し、株価、ニュース、AI分析結果、シグナルスコアを確認することを目的とする。

## 2. 設計方針

### 2.1 対象市場

MVPでは米国株を主対象とする。
ただし、日本株への将来拡張を前提に、銘柄マスタには市場、国、通貨、取引所を持たせる。

- Primary: 米国株
- Secondary: 日本株
- 比率イメージ: 米国株 8 / 日本株 2

### 2.2 株価データ

MVPでは日足データのみを保存する。
リアルタイム株価、分足、板情報、ティックデータは対象外とする。

### 2.3 ニュースデータ

無料API、RSS、外部ニュースソースから取得した情報を保存する。
本文全文の取得は必須とせず、タイトル、概要、URL、公開日時、配信元を中心に扱う。

### 2.4 AI分析

AI分析結果は、ニュースや将来の開示情報など、複数種別の対象に紐付けられるようにポリモーフィック設計とする。

分析基盤は差し替え可能とし、MVPでは外部LLM APIを想定する。
将来的に自前ホストLLM、Gemma、Llama、Qwen等へ差し替えられるよう、モデル名、プロバイダー、プロンプトバージョンを保存する。

---

## 3. テーブル一覧

## 3.1 MVP対象テーブル

| テーブル名 | 用途 |
|---|---|
| users | ユーザー管理 |
| stocks | 銘柄マスタ |
| stock_provider_symbols | 外部データプロバイダ固有の銘柄コード |
| watchlists | ユーザーの監視銘柄 |
| stock_prices | 日足株価データ |
| news_articles | ニュース記事 |
| stock_news | 銘柄とニュースの中間テーブル |
| analysis_results | AI分析結果 |
| stock_signals | 銘柄別シグナルスコア |
| alerts | アラート設定 |
| alert_logs | アラート発火履歴 |
| jobs | Laravel Queue用 |
| failed_jobs | Queue失敗管理 |

## 3.2 将来拡張テーブル

| テーブル名 | 用途 |
|---|---|
| disclosures | SEC、TDnet、EDINET等の開示情報 |
| stock_disclosures | 銘柄と開示情報の中間テーブル |
| macro_indicators | 金利、CPI、雇用統計、為替などのマクロ指標 |
| stock_memos | 銘柄ごとの詳細メモを分離する場合に使用 |
| ai_prompt_versions | AI分析プロンプトをDB管理する場合に使用 |

---

# 4. テーブル定義

## 4.1 users

Laravel Breezeの標準usersテーブルを利用する。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| name | varchar | NO | ユーザー名 |
| email | varchar | NO | メールアドレス |
| email_verified_at | timestamp | YES | メール認証日時 |
| password | varchar | NO | パスワードハッシュ |
| remember_token | varchar | YES | Remember token |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

### Index

| 種別 | カラム |
|---|---|
| unique | email |

---

## 4.2 stocks

銘柄マスタ。
米国株、日本株の両方を扱えるようにする。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| symbol | varchar(32) | NO | ティッカー、銘柄コード。例: AAPL, NVDA, 7203 |
| name | varchar(255) | NO | 銘柄名 |
| market | varchar(32) | NO | 市場区分。例: us, jp |
| exchange | varchar(64) | YES | 取引所。例: NASDAQ, NYSE, TSE |
| country | char(2) | NO | 国コード。例: US, JP |
| currency | char(3) | NO | 通貨。例: USD, JPY |
| sector | varchar(128) | YES | セクター |
| industry | varchar(128) | YES | 業種 |
| description | text | YES | 銘柄説明 |
| is_active | boolean | NO | 有効フラグ |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

### Index

| 種別 | カラム | 説明 |
|---|---|---|
| unique | market, symbol | 市場内で銘柄コードを一意にする |
| index | country | 国別検索用 |
| index | exchange | 取引所検索用 |
| index | sector | セクター検索用 |
| index | is_active | 有効銘柄検索用 |

### 備考

同じsymbolが市場をまたいで存在する可能性があるため、`symbol` 単体ではなく `market + symbol` を一意にする。
外部APIには `stocks.symbol` を直接渡さず、次の `stock_provider_symbols` で明示したプロバイダ固有コードを使用する。

---

## 4.2.1 stock_provider_symbols

画面表示・内部識別用の銘柄コードと、外部データプロバイダ固有の銘柄コードを分離する。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| stock_id | bigint unsigned | NO | stocks.id |
| provider | varchar(64) | NO | データ取得元。例: alpha_vantage |
| provider_symbol | varchar(64) | NO | プロバイダに渡す正式な銘柄コード |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

### Index

| 種別 | カラム | 説明 |
|---|---|---|
| unique | stock_id, provider | 1銘柄・1プロバイダに1つの対応関係 |
| unique | provider, provider_symbol | プロバイダ内で銘柄コードを一意にする |

### 備考

`market` や `exchange` から suffix を推測しない。プロバイダの検索APIや公式資料で確認できたコードだけを登録し、対応関係がない銘柄は取り込み対象から除外する。

---

## 4.3 watchlists

ユーザーが監視する銘柄を管理する。
保有数量、取得単価、損益は管理しない。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| user_id | bigint unsigned | NO | users.id |
| stock_id | bigint unsigned | NO | stocks.id |
| memo | text | YES | ユーザーメモ |
| priority | tinyint unsigned | NO | 重要度。1:低、2:中、3:高 |
| is_active | boolean | NO | 監視中フラグ |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

### Index

| 種別 | カラム | 説明 |
|---|---|---|
| unique | user_id, stock_id | 同一ユーザーが同一銘柄を重複登録しない |
| index | user_id, is_active | アクティブなウォッチリスト取得用 |
| index | stock_id | 銘柄側からの参照用 |
| index | priority | 重要度順表示用 |

### 備考

MVPでは複数ウォッチリストカテゴリは作らない。
将来的にカテゴリを作る場合は `watchlist_groups` を追加する。

---

## 4.4 stock_prices

日足株価を保存する。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| stock_id | bigint unsigned | NO | stocks.id |
| price_date | date | NO | 株価日付 |
| open | decimal(18,6) | YES | 始値 |
| high | decimal(18,6) | YES | 高値 |
| low | decimal(18,6) | YES | 安値 |
| close | decimal(18,6) | YES | 終値 |
| adjusted_close | decimal(18,6) | YES | 調整後終値 |
| volume | bigint unsigned | YES | 出来高 |
| source | varchar(64) | NO | 取得元。例: alpha_vantage |
| fetched_at | timestamp | YES | 取得日時 |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

### Index

| 種別 | カラム | 説明 |
|---|---|---|
| unique | stock_id, price_date, source | 同一ソースの日足重複防止 |
| index | stock_id, price_date | 銘柄詳細チャート用 |
| index | price_date | 日付検索用 |
| index | source | 取得元別確認用 |

### 備考

`close` と `adjusted_close` は分けて保存する。
チャートや分析では原則 `adjusted_close` を優先し、取得できない場合は `close` を利用する。

---

## 4.5 news_articles

外部ニュースAPI、RSS等から取得したニュース記事を保存する。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| title | varchar(500) | NO | ニュースタイトル |
| summary | text | YES | 外部API由来の概要 |
| body | longText | YES | 本文。取得できる場合のみ |
| url | text | NO | 記事URL |
| source | varchar(128) | YES | 配信元。例: Reuters, CNBC |
| provider | varchar(64) | NO | 取得API。例: alpha_vantage, rss |
| language | varchar(16) | YES | 言語。例: en, ja |
| published_at | timestamp | YES | 公開日時 |
| content_hash | char(64) | NO | 重複排除用ハッシュ |
| raw_payload | json | YES | APIレスポンス原文 |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

### Index

| 種別 | カラム | 説明 |
|---|---|---|
| unique | content_hash | 重複排除 |
| index | provider | 取得元別確認用 |
| index | source | 配信元別検索用 |
| index | published_at | 新着順表示用 |
| index | language | 言語別検索用 |

### 備考

ニュース本文全文は必須にしない。
無料API中心のため、タイトル、概要、URL、公開日時を主情報として扱う。

---

## 4.6 stock_news

銘柄とニュース記事の中間テーブル。
1つの記事が複数銘柄に関連する可能性があるため、中間テーブルにする。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| stock_id | bigint unsigned | NO | stocks.id |
| news_article_id | bigint unsigned | NO | news_articles.id |
| relevance_score | tinyint unsigned | YES | 関連度。0〜100 |
| matched_by | varchar(64) | YES | 紐付け方法。例: provider, keyword, ai |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

### Index

| 種別 | カラム | 説明 |
|---|---|---|
| unique | stock_id, news_article_id | 重複紐付け防止 |
| index | stock_id | 銘柄別ニュース取得用 |
| index | news_article_id | 記事側からの参照用 |
| index | relevance_score | 関連度順表示用 |

---

## 4.7 analysis_results

AI分析結果を保存する。
ニュース記事、将来の開示情報など複数対象に対応するため、ポリモーフィック関連で設計する。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| stock_id | bigint unsigned | NO | stocks.id |
| analysable_type | varchar(255) | NO | 分析対象モデル。例: NewsArticle |
| analysable_id | bigint unsigned | NO | 分析対象ID |
| summary | text | NO | AI要約 |
| sentiment | varchar(32) | NO | positive, neutral, negative |
| impact_score | tinyint | NO | 株価影響度。-10〜+10 |
| confidence_score | tinyint unsigned | NO | 信頼度。0〜100 |
| time_horizon | varchar(32) | NO | short_term, medium_term, long_term, unknown |
| positive_factors | json | YES | ポジティブ要因 |
| negative_factors | json | YES | ネガティブ要因 |
| risk_points | json | YES | リスク要因 |
| reason | text | NO | 判定理由 |
| model_provider | varchar(64) | NO | openai, gemini, local など |
| model_name | varchar(128) | NO | 利用モデル名 |
| prompt_version | varchar(32) | NO | プロンプトバージョン |
| input_tokens | integer unsigned | YES | 入力トークン数 |
| output_tokens | integer unsigned | YES | 出力トークン数 |
| analyzed_at | timestamp | NO | 分析日時 |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

### Index

| 種別 | カラム | 説明 |
|---|---|---|
| unique | stock_id, analysable_type, analysable_id, prompt_version | 同一対象の同一プロンプト重複分析防止 |
| index | stock_id, analyzed_at | 銘柄別分析履歴取得用 |
| index | analysable_type, analysable_id | 分析対象からの参照用 |
| index | sentiment | 感情分類フィルタ用 |
| index | impact_score | スコア順表示用 |
| index | model_provider, model_name | モデル別検証用 |
| index | prompt_version | プロンプト改善比較用 |

### sentiment定義

| 値 | 意味 |
|---|---|
| positive | ポジティブ材料 |
| neutral | 中立または影響不明 |
| negative | ネガティブ材料 |

### time_horizon定義

| 値 | 意味 |
|---|---|
| short_term | 短期材料 |
| medium_term | 中期材料 |
| long_term | 長期材料 |
| unknown | 判定不可 |

### 備考

AI分析の再現性・検証性のため、`model_provider`, `model_name`, `prompt_version` は必須とする。
将来ローカルLLMに差し替える場合も、このテーブル構造は維持する。

---

## 4.8 stock_signals

銘柄別の集計シグナルを保存する。
ニュースや分析結果を集計し、ダッシュボードや銘柄詳細画面で表示する。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| stock_id | bigint unsigned | NO | stocks.id |
| signal_date | date | NO | シグナル日付 |
| prompt_version | varchar(32) | NO | 集計元のAI分析prompt version |
| news_score | decimal(5,2) | NO | ニュース由来スコア |
| disclosure_score | decimal(5,2) | NO | 開示由来スコア。MVPでは0固定可 |
| macro_score | decimal(5,2) | NO | マクロ由来スコア。MVPでは0固定可 |
| total_score | decimal(5,2) | NO | 総合スコア |
| positive_count | integer unsigned | NO | ポジティブ件数 |
| negative_count | integer unsigned | NO | ネガティブ件数 |
| neutral_count | integer unsigned | NO | 中立件数 |
| reason | text | YES | 集計理由 |
| generated_at | timestamp | NO | 生成日時 |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

### Index

| 種別 | カラム | 説明 |
|---|---|---|
| unique | stock_id, signal_date, prompt_version | 銘柄・日付・prompt versionごとに1件 |
| index | stock_id, signal_date | 銘柄別推移取得用 |
| index | signal_date | 当日シグナル一覧用 |
| index | total_score | 強いシグナル抽出用 |

### 備考

MVPでは `news_score` を中心に算出し、`disclosure_score`, `macro_score` は0で保存してよい。表示・集計は現行設定の `prompt_version` に限定する。
将来の開示情報・マクロ指標連携で利用する。

---

## 4.9 alerts

ユーザーごとのアラート条件を保存する。
MVPではアプリ内通知を主対象とする。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| user_id | bigint unsigned | NO | users.id |
| stock_id | bigint unsigned | YES | stocks.id。市場全体アラートの場合はNULL可 |
| alert_type | varchar(64) | NO | signal_score, price_above, price_below, news_detected 等 |
| condition_operator | varchar(16) | NO | >=, <=, >, <, = |
| threshold_value | decimal(18,6) | YES | 閾値 |
| is_active | boolean | NO | 有効フラグ |
| last_triggered_at | timestamp | YES | 最終発火日時 |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

### Index

| 種別 | カラム | 説明 |
|---|---|---|
| index | user_id, is_active | 有効アラート取得用 |
| index | stock_id | 銘柄別アラート取得用 |
| index | alert_type | 種別別処理用 |
| index | last_triggered_at | 連続通知抑制用 |

### alert_type定義

| 値 | 意味 |
|---|---|
| signal_score | シグナルスコアが閾値を超えた |
| price_above | 株価が指定価格以上になった |
| price_below | 株価が指定価格以下になった |
| news_detected | 重要ニュースを検知した |

---

## 4.10 alert_logs

アラートの発火履歴を保存する。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| alert_id | bigint unsigned | NO | alerts.id |
| user_id | bigint unsigned | NO | users.id |
| stock_id | bigint unsigned | YES | stocks.id |
| message | text | NO | 通知メッセージ |
| payload | json | YES | 発火時の詳細情報 |
| read_at | timestamp | YES | 既読日時 |
| triggered_at | timestamp | NO | 発火日時 |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

### Index

| 種別 | カラム | 説明 |
|---|---|---|
| index | user_id, read_at | 未読通知取得用 |
| index | alert_id | アラート別履歴取得用 |
| index | stock_id | 銘柄別履歴取得用 |
| index | triggered_at | 新着通知表示用 |

---

# 5. 将来拡張テーブル

## 5.1 disclosures

SEC、TDnet、EDINETなどの開示情報を保存する。
MVPでは対象外だが、Phase 5以降で追加する。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| provider | varchar(64) | NO | sec, tdnet, edinet |
| document_type | varchar(64) | YES | 10-K, 10-Q, 8-K, 決算短信等 |
| title | varchar(500) | NO | 開示タイトル |
| document_url | text | YES | 書類URL |
| filing_date | date | YES | 提出日 |
| disclosed_at | timestamp | YES | 開示日時 |
| raw_text | longText | YES | 抽出テキスト |
| raw_payload | json | YES | APIレスポンス原文 |
| content_hash | char(64) | NO | 重複排除用 |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

---

## 5.2 stock_disclosures

銘柄と開示情報の中間テーブル。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| stock_id | bigint unsigned | NO | stocks.id |
| disclosure_id | bigint unsigned | NO | disclosures.id |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

---

## 5.3 macro_indicators

市場全体に影響するマクロ指標を保存する。

| カラム | 型 | NULL | 説明 |
|---|---:|:---:|---|
| id | bigint unsigned | NO | 主キー |
| name | varchar(128) | NO | 指標名。例: CPI, Fed Funds Rate |
| country | char(2) | YES | 国コード |
| value | decimal(18,6) | YES | 値 |
| unit | varchar(32) | YES | 単位 |
| observed_at | timestamp | NO | 観測日時 |
| source | varchar(64) | YES | 取得元 |
| created_at | timestamp | YES | 作成日時 |
| updated_at | timestamp | YES | 更新日時 |

---

# 6. ER図イメージ

```text
users
  ├── watchlists
  │     └── stocks
  ├── alerts
  └── alert_logs

stocks
  ├── stock_provider_symbols
  ├── watchlists
  ├── stock_prices
  ├── stock_news
  │     └── news_articles
  ├── analysis_results
  ├── stock_signals
  ├── alerts
  └── alert_logs

news_articles
  ├── stock_news
  └── analysis_results polymorphic

analysis_results
  └── analysable_type / analysable_id

stock_signals
  └── stocks
```

---

# 7. Eloquentリレーション設計

## 7.1 User

```php
class User extends Authenticatable
{
    public function watchlists(): HasMany
    {
        return $this->hasMany(Watchlist::class);
    }

    public function watchedStocks(): BelongsToMany
    {
        return $this->belongsToMany(Stock::class, 'watchlists')
            ->withPivot(['memo', 'priority', 'is_active'])
            ->withTimestamps();
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    public function alertLogs(): HasMany
    {
        return $this->hasMany(AlertLog::class);
    }
}
```

## 7.2 Stock

```php
class Stock extends Model
{
    public function providerSymbols(): HasMany
    {
        return $this->hasMany(StockProviderSymbol::class);
    }

    public function watchlists(): HasMany
    {
        return $this->hasMany(Watchlist::class);
    }

    public function usersWatching(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'watchlists')
            ->withPivot(['memo', 'priority', 'is_active'])
            ->withTimestamps();
    }

    public function prices(): HasMany
    {
        return $this->hasMany(StockPrice::class);
    }

    public function newsArticles(): BelongsToMany
    {
        return $this->belongsToMany(NewsArticle::class, 'stock_news')
            ->withPivot(['relevance_score', 'matched_by'])
            ->withTimestamps();
    }

    public function analysisResults(): HasMany
    {
        return $this->hasMany(AnalysisResult::class);
    }

    public function signals(): HasMany
    {
        return $this->hasMany(StockSignal::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }
}
```

## 7.3 NewsArticle

```php
class NewsArticle extends Model
{
    public function stocks(): BelongsToMany
    {
        return $this->belongsToMany(Stock::class, 'stock_news')
            ->withPivot(['relevance_score', 'matched_by'])
            ->withTimestamps();
    }

    public function analysisResults(): MorphMany
    {
        return $this->morphMany(AnalysisResult::class, 'analysable');
    }
}
```

## 7.4 AnalysisResult

```php
class AnalysisResult extends Model
{
    public function stock(): BelongsTo
    {
        return $this->belongsTo(Stock::class);
    }

    public function analysable(): MorphTo
    {
        return $this->morphTo();
    }
}
```

---

# 8. Migration作成順序

Laravelでは外部キー制約の都合上、以下の順序で作成する。

```text
1. users
2. stocks
3. stock_provider_symbols
4. watchlists
5. stock_prices
6. news_articles
7. stock_news
8. analysis_results
9. stock_signals
10. alerts
11. alert_logs
```

将来拡張時:

```text
12. disclosures
13. stock_disclosures
14. macro_indicators
```

---

# 9. 命名規則

## 9.1 テーブル名

Laravel標準に合わせ、複数形のスネークケースを使用する。

```text
stocks
stock_provider_symbols
stock_prices
news_articles
analysis_results
stock_signals
```

## 9.2 外部キー

```text
{singular_table_name}_id
```

例:

```text
user_id
stock_id
news_article_id
```

## 9.3 日付カラム

意味が明確な日付名にする。

```text
price_date
published_at
analyzed_at
generated_at
triggered_at
```

---

# 10. スコープ外データ

MVPでは以下のデータは保存しない。

```text
- 保有株数
- 取得単価
- 評価損益
- 実現損益
- 証券口座情報
- 売買注文履歴
- 配当入金履歴
- 資産総額
```

本アプリは資産管理アプリではなく、売買判断に関する情報収集・分析支援アプリである。

---

# 11. 補足: MySQL / PostgreSQL方針

MVPではMySQLまたはPostgreSQLのどちらでも実装可能。

ただし、将来的にJSON検索、全文検索、分析用途が増える場合はPostgreSQLも候補になる。

Laravelでの実装容易性を優先する場合は、既存経験に合わせてMySQLで開始して問題ない。

---

# 12. MVPで最初に作成するModel

```text
User
Stock
Watchlist
StockPrice
NewsArticle
AnalysisResult
StockSignal
Alert
AlertLog
```

中間テーブル `stock_news` はPivotとして扱い、必要に応じて `StockNews` Modelを作成する。

---

# 13. DB設計上の重要ポイント

## 13.1 stocksはmarket + symbolで一意にする

米国株、日本株を両方扱うため、`symbol` 単体ではなく `market + symbol` で一意制約を設定する。

## 13.2 外部APIはsymbolを明示的にマッピングする

`stock_provider_symbols` に登録済みの銘柄だけを各プロバイダの取り込み対象にする。内部表示用の `stocks.symbol` は外部APIに直接渡さない。

## 13.3 news_articlesはcontent_hashで重複排除する

無料ニュースAPIやRSSでは同じ記事を複数回取得する可能性があるため、`content_hash` を必須にする。

## 13.4 analysis_resultsにはモデル情報を残す

AI分析は後から改善するため、モデル名とプロンプトバージョンを必ず保存する。

## 13.5 stock_signalsは日次・prompt version単位で集計する

MVPでは日足データを扱うため、シグナルも日次単位で生成する。プロンプト改定前後の結果を混在・上書きしないよう `prompt_version` も一意キーに含める。

## 13.6 ウォッチリストは保有株管理ではない

watchlistsには保有数量や取得単価を持たせない。
アプリの役割を投資情報分析に限定する。
