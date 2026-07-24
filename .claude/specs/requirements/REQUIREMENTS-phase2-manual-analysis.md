# Phase 2 手動AI分析ワークフロー 要件定義書

## 1. 文書情報

| 項目 | 内容 |
|---|---|
| 対象 | 株式投資情報分析アプリ Phase 2 |
| 文書状態 | Draft |
| 基準ブランチ | `develop` |
| 基準コミット | `e1aa86a` |
| 作成日 | 2026-07-24 |
| 主利用者 | 認証済みの単一ユーザー |

### 1.1 文書の位置付け

本書は、取得済みニュースを利用したPhase 2のAI分析ワークフローについて、プロダクト要件を定義する。

Phase 2のAI分析方式について本書と次の既存資料が矛盾する場合、本書を優先する。

- `docs/app/要件定義書.md` のAI分析基盤、AI分析Phase、MVPでの外部LLM API利用方針
- `docs/app/stock_analysis_laravel_implementation_plan.md` の `OpenAiArticleAnalyzer`、AI分析Job、AI分析Command
- `docs/app/stock_analysis_laravel_db_design.md` のニュース記事単位を前提とした分析結果説明

本書はPhase 2以外の認証、銘柄、株価、ニュース収集、ウォッチリスト等の既存要件を変更しない。

---

## 2. 背景

現行資料では、取得したニュースをOpenAI等のLLM APIへ自動送信し、ニュース記事単位で分析する方式を想定している。

Phase 2では、LLM APIをアプリケーションから直接利用しない。アプリ内に取り込んだ複数ニュースから分析用プロンプトを生成し、利用者がChatGPT上で対話・検討した後、ChatGPTが生成したCSVをアプリへ戻す。

分析単位はニュース記事単体ではなく、次の組み合わせとする。

```text
1銘柄 × 1期間 × 複数ニュース
```

この単位の分析結果を、本書では「期間分析レポート」と呼ぶ。

---

## 3. 決定事項

| 項目 | 決定 |
|---|---|
| 分析単位 | 1銘柄 × 1期間 |
| 分析材料 | 対象銘柄に紐付くニュースのみ |
| LLM利用方法 | 利用者がChatGPTを手動操作する |
| アプリからのLLM API呼び出し | 行わない |
| 利用者 | 1人利用を前提とする |
| 分析結果形式 | UTF-8 CSV、1バッチにつき1データ行 |
| 通常の再取込 | 拒否する |
| 結果の置き換え | 専用操作、確認、置き換え理由を必須とする |
| 旧結果 | 削除せずrevisionとして保持する |
| 分析結果の出所 | `chatgpt_manual` として記録する |

---

## 4. 目的

### 4.1 プロダクト目的

- 取得済みニュースを銘柄・期間単位でまとめ、ChatGPTへ渡せるプロンプトを生成する。
- ChatGPTでの対話を利用者の判断過程に含める。
- ChatGPTの最終分析を固定スキーマのCSVとして安全に取り込む。
- 分析対象、入力ニュース、プロンプト、取込結果、置き換え履歴を後から追跡できるようにする。
- 取り込んだ期間分析レポートを銘柄詳細、Dashboard、シグナル表示へ反映する。

### 4.2 成功指標

- OpenAI APIキーを設定せず、期間分析レポートを作成できる。
- 3件以上のニュースを含む分析バッチを、プロンプト生成から画面反映まで完了できる。
- 不正なCSVから分析結果が保存されない。
- 通常操作では既存結果を上書きできない。
- 明示的な置き換え後も過去revisionを確認できる。
- 表示中の分析結果が、どの銘柄・期間・ニュース・prompt version・revisionに基づくか確認できる。

---

## 5. 対象外

Phase 2では次を対象外とする。

- OpenAI、Gemini、ローカルLLM等のAPI自動実行
- ChatGPTへの自動ログイン、画面操作、会話履歴取得
- ニュース以外の株価、出来高、開示情報、マクロ情報をプロンプトへ含めること
- 複数銘柄の横断分析
- 複数ユーザー間の承認、公開、共有範囲管理
- 自動売買、売買推奨、価格予測
- CSV以外の分析結果取込
- prompt versionを画面上で編集・公開する管理機能
- ChatGPTの会話URL、会話ID、会話本文、対話履歴の保存

ChatGPT上の対話過程はアプリの追跡対象とせず、バッチ作成時の入力スナップショット、保存済みプロンプト、最終CSV、利用モデル名、import履歴を監査対象とする。

---

## 6. 利用者と権限

### 6.1 利用者

本機能を操作できるのは、ログイン済みかつメール認証済みの利用者とする。

### 6.2 所有権

- 分析バッチは作成した利用者に紐付ける。
- 利用者は自分が作成した分析バッチのみ閲覧、出力、取込、置き換えできる。
- 1人利用を前提としても、サーバー側の所有者検証を省略しない。

---

## 7. 用語

| 用語 | 定義 |
|---|---|
| 分析バッチ | 1銘柄、1期間、複数ニュース、1つのprompt versionを固定した分析単位 |
| バッチキー | ChatGPTとの受け渡しに使う、推測困難な公開識別子 |
| ニュースキー | バッチ内の各ニュースへ付与する `N001` 形式の識別子 |
| 入力スナップショット | バッチ作成時点で固定したニュースのタイトル、概要、本文等 |
| 期間分析レポート | 1分析バッチに対して取り込まれた集約分析結果 |
| import | アップロードされたCSVと、その検証・確定状態を記録する単位 |
| revision | 同じ分析バッチに対して確定された分析結果の版 |
| current revision | 通常画面とシグナル生成に使用する最新の有効版 |
| 通常取込 | 分析結果が未登録のバッチへ初回結果を確定する操作 |
| 置き換え取込 | 既存結果を新revisionへ切り替える明示的な操作 |

---

## 8. 業務フロー

1. 利用者がAnalysis画面を開く。
2. 対象銘柄、開始日、終了日を選択する。
3. アプリが対象期間の関連ニュースを抽出する。
4. 利用者が対象ニュースを確認し、必要に応じて対象外ニュースを除く。
5. 利用者が分析バッチを作成する。
6. アプリが入力スナップショット、バッチキー、ニュースキー、prompt version、入力ハッシュを固定する。
7. 利用者がプロンプトをコピーするか、テキストファイルとしてダウンロードする。
8. 利用者がChatGPTへプロンプトを入力し、対話・検討する。
9. 利用者がChatGPTへ最終CSVの生成を依頼する。
10. 利用者がCSVと利用モデル名をアプリへ入力する。
11. アプリがCSVを検証し、保存前プレビューを表示する。
12. 利用者が内容を確認して確定する。
13. アプリが期間分析レポート、import履歴、シグナルを一括更新する。
14. 利用者がAnalysis画面、銘柄詳細、Dashboardで結果を確認する。

---

## 9. 機能要件

### FR-01 Analysis画面

- メインナビゲーションに `Analysis` を追加する。
- Analysis一覧では、自分の分析バッチを更新日時の降順で表示する。
- 一覧には最低限、銘柄、分析期間、ニュース件数、状態、current revision、最終更新日時を表示する。
- 状態で絞り込めるようにする。
- 新規分析バッチ作成への主要導線を表示する。
- バッチが0件の場合は、次に行う操作を示す空状態を表示する。

### FR-02 対象銘柄・期間の指定

- 対象銘柄は、自分のウォッチリストに登録され、`watchlists.is_active = true` かつ `stocks.is_active = true` の銘柄から1件選択する。
- 開始日と終了日は `Asia/Tokyo` の暦日として入力する。
- 開始日は終了日以前でなければならない。
- 終了日はJSTの当日以前とし、未来日は指定できない。
- 開始日から終了日までの期間は、両端を含め最大31暦日とする。
- 画面上の終了日は含む。
- DB検索時はJSTの開始日00:00以上、終了日の翌日00:00未満をUTCへ変換して検索する。
- 初期期間は直近7日とする。
- preview後、バッチ作成までにウォッチリストまたは銘柄が無効化された場合は、作成時のサーバー側再検証で拒否する。

### FR-03 対象ニュースの抽出・選択

- 対象銘柄と `stock_news` で紐付くニュースのみ抽出する。
- `published_at` が対象期間内にあるニュースのみ抽出する。
- `published_at` がないニュースは対象外とする。
- 初期状態では抽出した全ニュースを選択する。
- 利用者はバッチ作成前にニュースを対象外へ変更できる。
- 「複数ニュース」の最小単位として、2件以上のニュース選択を必須とする。
- 並び順は `published_at` 昇順、同値の場合は `news_article_id` 昇順で固定する。
- バッチに含められる件数と総文字数には設定可能な上限を設ける。
- Phase 2の初期値は20件、入力スナップショット合計100,000文字とする。
- 総文字数は、各ニュースのtitle、summary、body、source、urlをLFへ改行統一した後、PHPの `mb_strlen(..., 'UTF-8')` 相当で数えたUnicode文字数の合計とする。
- `null` は0文字として数え、JSONのキー、引用符、区切り文字等のシリアライズ上の文字は含めない。
- 上限を超える場合は、ニュースを減らすよう画面上で案内する。

### FR-04 分析バッチ作成

- 分析バッチは、銘柄、期間、選択ニュース、prompt versionを一括して保存する。
- バッチキーには推測困難なULIDを使用する。
- ニュースキーは公開順の古いものから `N001`、`N002` のように採番する。
- バッチ作成時点のニュース内容を入力スナップショットとして保存する。
- 入力スナップショット全体からSHA-256の入力ハッシュを生成して保存する。
- バッチ作成時に、当該prompt versionのテンプレートからプロンプト本文を1回だけ生成し、本文とSHA-256のプロンプトハッシュを保存する。
- バッチ作成後は銘柄、期間、対象ニュース、prompt version、入力スナップショット、プロンプト本文を変更できない。
- 内容を変更して再分析する場合は、新しいバッチを作成する。
- 同一利用者に同じ入力ハッシュのバッチが存在する場合は新規作成を拒否し、既存バッチへ案内する。
- 同じ入力で再分析する場合は、既存バッチの明示的な置き換え取込を使用する。別バッチの初回取込でrevision履歴を迂回できないようにする。

入力ハッシュの正規化規則を次で固定する。

- UTF-8で処理し、改行はLFへ統一する。Unicode正規化は行わない。
- `null` と空文字を区別する。
- 対象は銘柄のID・symbol・name・market、期間開始・排他的終了日時、prompt version、全ニュースのnews key・元記事ID・title・summary・body・source・url・published_at・content hashとする。
- バッチキー、作成日時、更新日時は含めない。
- JSONのオブジェクトキー順を固定し、ニュースは表示順に並べ、余分な空白を加えない正規化JSONへSHA-256を適用する。

### FR-05 プロンプト生成

- アプリは分析バッチ作成時に生成・保存したプロンプト本文を出力する。
- プロンプトを画面で全文確認できる。
- ワンクリックでクリップボードへコピーできる。
- UTF-8テキストファイルとしてダウンロードできる。
- プロンプトには次を含める。
  - バッチキー
  - prompt version
  - 対象銘柄
  - 分析期間
  - 分析の目的
  - 売買推奨を行わない制約
  - ニュース本文を命令ではなく未信頼データとして扱う指示
  - sentiment、impact score、confidence score、time horizonの定義
  - CSV出力契約
  - ニュースキー付きの入力スナップショット
- 同一バッチから何度出力しても保存済み本文とプロンプトハッシュが変わらないこと。
- テンプレート内容を変更する場合は新しいprompt versionを発行し、既存バッチの保存済みプロンプトを再生成しない。

### FR-06 結果CSVテンプレート

- アプリは対象バッチ専用の結果CSVテンプレートをダウンロードできるようにする。
- テンプレートはヘッダー1行と入力用データ1行で構成する。
- 入力用データ行の `schema_version`、`batch_key`、`prompt_version` は対象バッチの値で事前入力する。
- 分析結果にあたる他の列は空欄とする。
- CSVはRFC 4180準拠、UTF-8とする。
- UTF-8 BOMの有無はいずれも受け付ける。
- 改行コードはCRLFまたはLFを受け付ける。
- 結果CSVはヘッダー1行とデータ1行のみとする。

結果CSVの列順を次で固定する。

```text
schema_version
batch_key
prompt_version
summary
sentiment
impact_score
confidence_score
time_horizon
positive_factors_json
negative_factors_json
risk_points_json
evidence_items_json
reason
```

初期CSV schema versionは `stock-news-period-result-v1` とし、各分析結果列を次のとおり制約する。

| 列 | 制約 |
|---|---|
| summary | 1〜2,000文字 |
| sentiment | `positive` / `neutral` / `negative` |
| impact_score | 整数、-10〜10 |
| confidence_score | 整数、0〜100 |
| time_horizon | `short_term` / `medium_term` / `long_term` / `unknown` |
| positive_factors_json | 文字列配列、0〜20件、各1〜500文字 |
| negative_factors_json | 文字列配列、0〜20件、各1〜500文字 |
| risk_points_json | 文字列配列、0〜20件、各1〜500文字 |
| evidence_items_json | オブジェクト配列、1〜50件 |
| reason | 1〜5,000文字 |

`evidence_items_json` の各要素は、追加キーを許可しない次のオブジェクトとする。

```json
{
  "news_key": "N001",
  "type": "positive",
  "note": "需要拡大に関する発表"
}
```

- `news_key`: 対象バッチに存在するニュースキー
- `type`: `positive` / `negative` / `risk` / `context`
- `note`: 1〜1,000文字
- 同じニュースキーを複数要素で参照することは許可し、シグナル算出時にFR-13の規則で1分類へ正規化する。
- 配列順はChatGPTが提示した根拠順として保持する。

### FR-07 結果CSVアップロード

- アップロード可能な拡張子は `.csv` のみとする。
- Phase 2の最大ファイルサイズは1MBとする。
- 利用者はChatGPTで利用したモデル名を1〜128文字の自由入力で指定する。前後空白は除去し、空文字は拒否する。
- モデル名を特定できない場合は、利用者が明示的に `unknown` を選択する。
- 通常取込と置き換え取込を別操作として扱う。
- プロンプトのコピー成功、またはプロンプト／テンプレートのダウンロードが1回以上記録されたバッチだけアップロードできる。
- current revisionが存在するバッチへの通常取込は、アップロード前に拒否する。
- upload時点のcurrent import IDをimportへ保存する。currentがない場合は `null` とする。
- uploadは利用者単位で10分あたり20回、同一バッチ単位で10分あたり10回に制限する。
- private storageに保持中のraw CSV合計が利用者あたり1GiB（1,073,741,824 bytes）を超えるuploadは、保存前に拒否する。

### FR-08 CSV検証

アプリは少なくとも次を検証する。

- ファイルサイズ、拡張子、読み取り可否
- UTF-8として解釈できること
- ヘッダー名、列数、列順が完全一致すること
- データ行が1行だけであること
- `schema_version` がアプリの対応版と一致すること
- `batch_key` が対象バッチと一致すること
- `prompt_version` が対象バッチと一致すること
- `summary` と `reason` が空でないこと
- `sentiment` が `positive`、`neutral`、`negative` のいずれかであること
- `impact_score` が整数かつ -10以上10以下であること
- `confidence_score` が整数かつ0以上100以下であること
- `time_horizon` が `short_term`、`medium_term`、`long_term`、`unknown` のいずれかであること
- 3つのfactor列がJSON文字列配列であること
- `evidence_items_json` が所定のJSONオブジェクト配列であること
- evidenceの `news_key` が対象バッチ内に存在すること
- evidenceの `type` が `positive`、`negative`、`risk`、`context` のいずれかであること
- evidenceが1件以上あること
- 文字列長、配列件数が上限以内であること
- 同一バッチ内で、CSVの生バイト列から計算したSHA-256ファイルハッシュが既存importと重複しないこと

重複判定には `invalid`、`validated`、`stale`、`committed`、`superseded` の全importを含める。置き換え取込であっても、同一ファイルの再アップロードは拒否する。

### FR-09 保存前プレビュー

- CSVアップロード後、分析結果を画面上で読みやすい形式へ変換して表示する。
- 元のCSV文字列だけを確認させない。
- エラーがある場合は、列名、内容、修正方法を表示する。
- エラーが1件でもあるimportは確定できない。
- プレビュー時点では `analysis_results` とPhase 2のsignal projectionを変更しない。
- プレビューには対象銘柄、期間、ニュース件数、prompt version、モデル名、取込モードを併記する。
- プレビューにはupload時点のcurrent revisionを表示し、確定までの競合検知に使用する。
- upload後にcurrent revisionが変わったimportは `stale` として確定不可にする。
- `stale` importは通常uploadを再実行させず、専用の「最新revisionに対して再プレビュー」操作で保存済みraw CSVを再検証する。
- stale importのraw CSVが保持期限切れの場合は、専用再プレビュー操作で同じCSVを再選択できる。生バイトのfile hashが元importと一致する場合だけ同じimportへraw CSVを復元し、新しいimportは作成しない。
- staleになったinitial importを再準備するときにcurrent revisionが存在する場合は、置き換え理由の入力と確認を必須にし、replace modeへ変更する。

### FR-10 通常取込

- current revisionが存在しないバッチのみ通常取込できる。
- 確定時にCSVを再検証する。
- 確定処理はトランザクションで実行する。
- 初回のrevision番号は1とする。
- `model_provider` は `chatgpt_manual` とする。
- `model_name` はアップロード時に利用者が指定した値とする。
- `analyzed_at` は確定時のUTC日時とする。
- `input_tokens` と `output_tokens` は `null` とする。
- 保存後、そのimportをcurrent revisionとして設定する。
- upload時と確定時のcurrent import IDが一致しない場合は、importを `stale` にして確定を拒否する。

### FR-11 置き換え取込

- current revisionが存在する場合のみ置き換え取込できる。
- 通常取込とは別の「分析結果を置き換える」操作から開始する。
- 操作前に、現在のrevisionと置き換え後のrevisionを明示する。
- 置き換え理由を必須とする。
- 確定直前に確認ダイアログを表示する。
- 確定処理はトランザクションで実行する。
- 新しいrevision番号は、当該バッチの確定済み最大revision + 1とする。
- 旧revisionを削除せず `superseded` として保持する。
- 新revisionをcurrent revisionへ切り替える。
- 置き換え前後の分析内容、ファイルハッシュ、モデル名、日時、理由を確認できるようにする。
- upload時と確定時のcurrent import IDが一致しない場合は、後勝ち上書きを行わず、importを `stale` にして再プレビュー操作を案内する。

### FR-12 分析結果表示

- Analysis詳細画面でcurrent revisionを最優先表示する。
- 次を表示する。
  - 対象銘柄
  - 分析期間
  - 対象ニュース件数
  - summary
  - sentiment
  - impact score
  - confidence score
  - time horizon
  - positive factors
  - negative factors
  - risk points
  - reason
  - evidenceと参照ニュース
  - prompt version
  - model provider
  - model name
  - revision
  - 分析日時
- evidenceからバッチ内ニュースのタイトルと元記事URLを確認できる。
- 過去revisionは履歴セクションで確認できる。
- 銘柄詳細画面には、その銘柄で最も期間終了日時が新しい完了バッチのcurrent revisionを表示する。
- 最新は `period_end_at DESC`、`period_start_at DESC`、current importの `committed_at DESC`、分析バッチID `DESC` の順で決定する。

### FR-13 シグナル反映

- current revision確定後、対象銘柄のシグナルを再計算する。
- 最新期間分析レポートのcurrent revisionだけをシグナル計算に使用する。
- 過去期間のレポートを後から取り込んでも、より新しい期間のシグナルを上書きしない。
- Phase 2のニューススコアは次で算出する。

```text
news_score = round(impact_score × confidence_score ÷ 100, 2)
```

- `disclosure_score` と `macro_score` は0とする。
- `total_score` は `news_score` とする。
- positive、negative、neutral件数は、evidenceが参照する重複しないニュースキーを分類して算出する。
- `context` のみのニュースはneutral件数へ含める。
- 1ニュースが複数typeで参照された場合は、`negative`、`risk`、`positive`、`context` の優先順で1分類へ正規化する。
- `risk` に分類されたニュースはnegative件数へ含める。
- シグナルから元のanalysis importとrevisionを追跡できるようにする。

### FR-14 バッチ・import履歴

- バッチ詳細で、作成、プロンプト出力、CSVアップロード、検証、確定、置き換えを時系列で確認できる。
- invalidなimportもファイルハッシュと検証エラーを確認できる。
- 生CSVは公開ストレージへ保存しない。
- raw CSVはprivate storageへ保存し、未確定importは直近のraw保存・復元日時から30日、確定済み・置き換え済みimportはcommitから365日保持する。
- 保持期限後はraw CSVだけを削除し、import行、ファイルハッシュ、検証エラー、normalized payload、revision履歴は保持する。
- raw CSV保存・復元日時と削除日時を記録する。期限切れraw CSVを復元した場合は保存日時を復元時刻へ更新する。raw CSVが期限切れの未確定importは `stale` とし、同一hashのCSVを復元して再プレビューするまで確定できない。
- Phase 2では生CSVの再ダウンロード、個別削除、一括削除の画面・ルートを提供しない。
- プロンプトの表示だけでは出力扱いにしない。コピー成功をクライアントが通知した時点、またはプロンプト／テンプレートのダウンロードレスポンスを返す時点で、初回の出力日時を記録する。
- コピー・ダウンロードは初回出力日時のみを保持し、IPアドレス、ChatGPT会話情報、操作ごとの専用イベントログは保存しない。
- 分析バッチ、確定済みrevision、import履歴を画面から物理削除しない。

---

## 10. 状態要件

### 10.1 分析バッチ

```text
prepared → exported → completed
```

| 状態 | 意味 |
|---|---|
| `prepared` | 入力スナップショットが確定済み |
| `exported` | プロンプトのコピー成功、またはプロンプト／テンプレートのダウンロードが1回以上成功 |
| `completed` | current revisionが存在する |

- `completed` 後に置き換えを行っても、バッチ状態は `completed` のままとする。
- 状態は後戻りさせない。

### 10.2 import

```text
uploaded → validated → committed → superseded
    └──→ invalid
    └──→ stale
validated → stale → validated
```

| 状態 | 意味 |
|---|---|
| `uploaded` | CSVを受領済み |
| `validated` | 検証に成功し、確定待ち |
| `invalid` | 検証に失敗 |
| `stale` | current revisionの変化またはraw CSV期限切れにより、再プレビュー待ち |
| `committed` | current revisionとして確定済み |
| `superseded` | 後続revisionに置き換えられた旧版 |

---

## 11. データ要件

### 11.1 入力スナップショット

各ニュースについて次を保存する。

- `news_article_id`
- `news_key`
- 表示順
- title
- summary
- body
- source
- url
- published_at
- content_hash
- snapshot_hash

`summary`、`body`、`source` は `null` を許可し、スナップショットJSONでもJSONの `null` として保持する。title、url、published_atは必須とする。URLは原文を保持し、HTTP/HTTPSとして妥当な場合だけ画面でリンク化する。

`snapshot_hash` は、入力ハッシュと同じUTF-8、LF、null、キー順の正規化規則を、当該ニュースのスナップショット項目へ適用して算出する。`content_hash` は元ニュースが保持する値をコピーし、スナップショットの同一性判定には `snapshot_hash` を使用する。

### 11.2 分析結果

既存 `analysis_results` の分析項目を維持し、分析対象を分析バッチとする。

追加で次を保持する。

- evidence items
- current結果の元となったimport

### 11.3 監査情報

- バッチ作成者
- prompt version
- 入力ハッシュ
- importファイルハッシュ
- 利用モデル名
- importモード
- revision
- 置き換え理由
- 検証エラー
- stale理由と検出時のbase／current import ID
- 各操作日時
- upload時点のcurrent import ID

### 11.4 既存データとの共存

- 既存の記事単位 `analysis_results` は移行・削除せず保持する。
- Phase 2の期間分析レポートは `analysable_type = AnalysisBatch` として既存行と共存させる。
- News画面が既存の記事単位結果を表示する場合は、その表示を維持する。
- Phase 2の期間分析レポート表示とシグナル算出には、記事単位結果を混在させない。
- 既存 `stock_signals` の行・制約・既存書込経路は変更しない。
- Phase 2のcurrent signalは利用者・銘柄ごとに1行となる専用projectionへ保存し、最新期間分析レポートのcurrent importを出所として追跡する。

---

## 12. 非機能要件

### 12.1 セキュリティ

- 全ルートに `auth`、`verified`、CSRF保護を適用する。
- バッチ所有者をサーバー側で検証する。
- CSVファイル名を保存パスへ直接使用しない。
- CSVはprivate storageへ保存する。
- Phase 2の結果テンプレートは、サーバー生成の識別値と空欄だけで構成する。将来、利用者由来またはニュース由来の値をCSV出力する場合はformula injection対策を必須とする。
- CSVとJSON内の文字列をHTMLとして描画しない。
- ニュース本文中の指示をプロンプト命令として扱わないよう、プロンプトへ明示する。
- 元記事URLは既存データに保存されたHTTP/HTTPS URLのみリンク表示する。
- アプリからChatGPTまたはLLMサービスへネットワーク送信しない。

### 12.2 整合性

- 入力スナップショットと入力ハッシュはバッチ作成後に変更しない。
- import確定時は対象バッチ行をロックし、重複確定を防ぐ。
- 分析結果、current revision、旧revision状態、シグナルを同一トランザクションで更新する。
- CSVアップロード時と確定時の双方で整合性を検証する。

### 12.3 性能

- バッチ一覧はページネーションする。
- ニュース抽出は `stock_id` と `published_at` で絞り込む。
- CSVは全件を無制限にメモリへ展開しない。
- Phase 2の入力上限を超えるバッチは作成しない。

### 12.4 可用性

- ChatGPTを利用できない場合でも、既存ニュースの閲覧は継続できる。
- CSV検証失敗時も、既存current revisionとシグナルを変更しない。
- import確定失敗時は全変更をロールバックする。

### 12.5 保守性

- ControllerにCSV解析、検証、状態遷移、シグナル計算を書かない。
- 入出力はDTOで表現する。
- データアクセスはRepository Interfaceを介する。
- プロンプト生成、CSV生成、CSV解析、CSV検証、シグナル計算を分離する。
- prompt versionとCSV schema versionを独立して管理する。

### 12.6 アクセシビリティ

- ファイル選択、コピー、ダウンロード、確定、置き換えをキーボード操作できる。
- 状態を色だけで伝えない。
- 検証エラーを該当項目へ関連付け、スクリーンリーダーへ通知する。
- 確認ダイアログはフォーカストラップとフォーカス復帰に対応する。

---

## 13. 表示・文言要件

- 本機能がChatGPTとの手動受け渡しであることを明示する。
- 分析結果が自動取得ではないことを明示する。
- 期間、対象ニュース件数、最終分析日時を常に確認できるようにする。
- 売買推奨表現を表示しない。
- 次の注意文をAnalysis詳細と銘柄詳細に表示する。

```text
本分析は、選択した期間のニュースをもとにChatGPTとの対話を経て作成した参考情報です。
特定の金融商品の売買を推奨するものではなく、将来の価格を保証しません。
投資判断は利用者自身の責任で行ってください。
```

---

## 14. エラー要件

| 状況 | 期待動作 |
|---|---|
| 対象ニュース2件未満 | バッチ作成を拒否し、期間変更またはニュース追加を案内する |
| 件数・文字数上限超過 | 対象ニュースを減らすよう案内する |
| 未来日・31暦日超過 | バッチ作成を拒否し、許可範囲を表示する |
| 同一入力ハッシュの既存バッチ | 新規作成を拒否し、既存バッチへ案内する |
| バッチキー不一致 | importをinvalidにし、DBへ反映しない |
| prompt version不一致 | importをinvalidにし、正しいテンプレート利用を案内する |
| 未知のニュースキー | importをinvalidにし、該当キーを表示する |
| JSON列不正 | importをinvalidにし、列名と解析エラーを表示する |
| 通常取込の重複 | アップロードを拒否し、置き換え操作を案内する |
| 置き換え理由なし | 確定を拒否する |
| 確定時の競合 | 後勝ちにせず、importをstaleにする |
| upload後にcurrent revision変更 | 古いプレビューの確定を拒否し、専用の再プレビューを案内する |
| upload rate超過 | 429相当で拒否し、再試行可能時刻を案内する |
| raw CSV quota超過 | ファイル保存前に拒否し、現在量と上限を案内する |
| シグナル更新失敗 | 分析結果を含むトランザクションをロールバックする |

---

## 15. 受入条件

### AC-01 バッチ作成

有効なウォッチリスト銘柄と期間を指定し、期間内ニュース3件以上を含む分析バッチを作成できる。

### AC-02 再現可能なプロンプト

同一バッチから複数回生成したプロンプトが同一内容となり、バッチキー、prompt version、全ニュースキーを含む。

### AC-03 正常取込

仕様どおりのCSVをアップロードすると保存前プレビューが表示され、確定後にrevision 1として表示される。

### AC-04 不正CSV

ヘッダー不正、範囲外スコア、不正JSON、未知のニュースキーのいずれかを含むCSVでは確定できず、`analysis_results` とPhase 2のsignal projectionが変更されない。

### AC-05 通常の重複拒否

revision 1が存在するバッチへ通常取込を行うと拒否される。

### AC-06 明示的な置き換え

置き換え理由を入力し、確認操作を行った場合のみrevision 2を確定できる。revision 1は `superseded` として参照できる。

### AC-07 画面反映

current revisionがAnalysis詳細と銘柄詳細に表示され、evidenceから対象ニュースを確認できる。

### AC-08 シグナル反映

current revisionの `impact_score` と `confidence_score` からニューススコアが算出され、Dashboardと銘柄詳細へ反映される。

### AC-09 過去期間の保護

最新期間より古い期間のバッチを後から確定しても、最新期間に基づくシグナルが上書きされない。

### AC-10 外部API非依存

Phase 2の全受入シナリオが、OpenAI APIキーなし、LLM APIへのHTTP通信なしで完了する。

### AC-11 所有者・有効銘柄の保護

未認証、メール未認証、他利用者所有のバッチ、無効なウォッチリスト銘柄の各操作がサーバー側で拒否される。

### AC-12 期間境界と入力上限

JSTの開始日00:00以上、終了日の翌日00:00未満のニュースだけが抽出され、未来の終了日、32暦日以上、21件以上、100,001文字以上、2件未満のバッチは作成できない。

### AC-13 入力・プロンプトの不変性

元ニュースまたはpromptテンプレート実装をバッチ作成後に変更しても、保存済みスナップショット、入力ハッシュ、プロンプト本文、プロンプトハッシュは変化しない。

### AC-14 重複ファイルと並行確定

同一バッチへ同じ生CSVを再アップロードできず、validated importの作成後に別importがcurrent revisionを変更した場合は古いimportがstaleになる。stale importは保存済みraw CSVの専用再プレビュー後だけ、最新revisionに対して確定できる。

### AC-15 複数回の置き換え

revision 3まで置き換えてもrevision 1と2を参照でき、current revisionは3だけとなる。

### AC-16 生CSVの非公開

raw CSVがprivate storageに保持され、公開URLおよび再ダウンロードルートから取得できない。未確定は直近のraw保存・復元から30日、確定済み・置き換え済みはcommitから365日の経過後にraw CSVだけが削除され、importメタデータとrevision履歴は残る。

### AC-17 同一入力バッチの重複防止

同一利用者・同一入力ハッシュの2つ目のバッチは作成できず、同じ入力での再分析は既存バッチの明示的な置き換えとしてrevisionへ記録される。

### AC-18 upload容量・頻度制限

利用者20回／10分、同一バッチ10回／10分のいずれかを超えるuploadは429相当で拒否され、保持中raw CSVが利用者合計1GiBを超えるuploadはファイル保存前に拒否される。

---

## 16. Phase 2完了条件

- 本書の全受入条件を自動テストまたはE2Eテストで検証している。
- Analysis一覧、作成、詳細、importプレビュー、置き換えの主要導線が実装されている。
- prompt versionとCSV schema versionが固定・記録されている。
- 通常取込と置き換え取込の境界がサーバー側で保証されている。
- 既存の外部LLM API前提スケジュール、Job、CommandをPhase 2の実行経路として使用していない。
- 分析結果とシグナルから元バッチ、ニュース、revisionを追跡できる。
- 投資助言ではない旨の注意表示がある。
