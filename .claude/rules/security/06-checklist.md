# セキュリティ実装チェックリスト

本チェックリストは、コード実装時およびコードレビュー時に使用する。すべての項目をクリアすることを必須とする。

---

## 1. SQLインジェクション対策

- [ ] Eloquent ORM または Query Builder を使用している
- [ ] Raw クエリを使用する場合はパラメータバインディング（`?` または `:name`）を実装している
- [ ] `whereRaw()`, `orderByRaw()` 等を使用する場合は必ずバインディングしている
- [ ] カラム名やテーブル名に外部入力を使用する場合はホワイトリスト検証を実装している
- [ ] 本番環境で `APP_DEBUG=false` に設定している
- [ ] DBアカウントは最小権限で設定している（SELECT, INSERT, UPDATE, DELETE のみ）
- [ ] 文字列連結によるSQL構築を行っていない

---

## 2. OSコマンド・インジェクション対策

- [ ] `exec()`, `shell_exec()`, `system()`, `passthru()` 等のOS コマンド実行関数を使用していない
- [ ] やむを得ず使用する場合は Symfony Process コンポーネントを使用している
- [ ] `escapeshellarg()` のみに依存せず、入力値をホワイトリスト方式で検証している
- [ ] PHP標準関数やライブラリで代替できる処理を探している
- [ ] バッククォート演算子 `` `command` `` を使用していない

---

## 3. ディレクトリ・トラバーサル対策

- [ ] ファイル名の指定にホワイトリスト方式を使用している（推奨）
- [ ] `basename()` でファイル名のみ取得している
- [ ] `realpath()` + ベースディレクトリ検証を実装している
- [ ] Storage Facade を使用している
- [ ] ファイルタイプ（MIME type）のバリデーションを実装している
- [ ] ファイルサイズの制限を実装している
- [ ] アップロードファイル名をランダム化している
- [ ] `../` の単純削除のみに依存していない

---

## 4. XSS対策（Laravel/Blade）

- [ ] Bladeテンプレートで `{{ }}` を使用している
- [ ] `{!! !!}` を使用する場合は HTMLPurifier でサニタイズしている
- [ ] HTML属性値がダブルクォートで囲まれている
- [ ] JavaScript内で変数を出力する場合は `@json()` を使用している
- [ ] HTMLPurifier の `CleanHtml` キャストを使用している（HTML許可時）
- [ ] CSPヘッダーが適切に設定されている

---

## 5. XSS対策（React）

- [ ] JSXのデフォルト動作（自動エスケープ）を活用している
- [ ] `dangerouslySetInnerHTML` 使用時に DOMPurify でサニタイズしている
- [ ] DOMPurify の `ALLOWED_TAGS` と `ALLOWED_ATTR` を明示的に指定している
- [ ] ユーザー入力のURLに `javascript:` スキームが含まれていないか検証している
- [ ] URL検証には `new URL()` でパースして protocol をチェックしている
- [ ] インラインイベントハンドラ（`onclick` 等）を使用していない

---

## 6. CSRF対策

- [ ] POST/PUT/PATCH/DELETEフォームに `@csrf` ディレクティブを使用している
- [ ] React SPAで `withCredentials: true` を設定している
- [ ] React SPAで `withXSRFToken: true` を設定している
- [ ] ログイン前に `/sanctum/csrf-cookie` にアクセスしている
- [ ] 外部Webhook以外でCSRF検証を除外していない
- [ ] API認証にLaravel Sanctum を使用している（SPA認証）

---

## 7. セッション管理

- [ ] ログイン成功後に `session()->regenerate()` でセッションIDを再生成している
- [ ] ログアウト時に `session()->invalidate()` でセッションを無効化している
- [ ] ログアウト時に `session()->regenerateToken()` でトークンを再生成している
- [ ] CookieにSecure属性が設定されている（`SESSION_SECURE_COOKIE=true`）
- [ ] CookieにHttpOnly属性が設定されている（`http_only: true`）
- [ ] SameSite属性が適切に設定されている（`same_site: 'lax'` または `'strict'`）
- [ ] セッションドライバは本番環境で `database` または `redis` を使用している
- [ ] セッションの有効期限が適切に設定されている（推奨: 120分）
- [ ] `SANCTUM_STATEFUL_DOMAINS` が正しく設定されている（SPA認証使用時）

---

## 8. HTTPヘッダ・インジェクション対策

- [ ] ヘッダ出力には Laravel の `redirect()` や `response()` を使用している
- [ ] 外部入力から改行コード（`\r`, `\n`）を削除している
- [ ] URLリダイレクトにはホワイトリスト検証を実装している
- [ ] リダイレクト先のホスト名を検証している
- [ ] 生のヘッダ出力（`header()` 関数）を使用していない

---

## 9. メールヘッダ・インジェクション対策

- [ ] メール送信に Laravel の Mailable クラスを使用している
- [ ] メールヘッダに外部入力を直接使用していない
- [ ] 外部入力を件名等に使用する場合、改行コード・制御文字を削除している
- [ ] メールアドレスのバリデーションに `email:rfc,dns` を使用している
- [ ] 生の `mail()` 関数を使用していない

---

## 10. クリックジャッキング対策

- [ ] X-Frame-Options ヘッダを設定している（`SAMEORIGIN`）
- [ ] Content-Security-Policy の `frame-ancestors` を設定している
- [ ] SecurityHeadersMiddleware を実装している
- [ ] すべてのレスポンスにセキュリティヘッダが適用されている

---

## 11. セキュリティヘッダ設定

- [ ] X-Content-Type-Options: nosniff を設定している
- [ ] Strict-Transport-Security（HSTS）を本番環境で設定している
- [ ] Content-Security-Policy（CSP）を適切に設定している
- [ ] Referrer-Policy を設定している（`strict-origin-when-cross-origin`）
- [ ] X-Powered-By, Server ヘッダを削除している
- [ ] Permissions-Policy を設定している
- [ ] SecurityHeadersMiddleware がすべてのレスポンスに適用されている

---

## 12. アクセス制御・認可

- [ ] 全ての保護リソースに対してサーバーサイドで認可チェックを実装している
- [ ] Laravel Policy を使用してリソースアクセスを制御している
- [ ] URLパラメータからユーザーIDを取得していない
- [ ] セッションから認証済みユーザー情報を取得している（`auth()->user()`）
- [ ] 所有リソースへのアクセスはスコープを使用している（`user()->posts()`）
- [ ] Controller で `$this->authorize()` を使用している
- [ ] フロントエンドの認可チェックのみに依存していない

---

## 13. 認証・パスワード管理

- [ ] パスワードは `Hash::make()` でハッシュ化している
- [ ] ハッシュアルゴリズムは bcrypt または Argon2id を使用している
- [ ] パスワードポリシーを適用している（最小8文字、大小英数記号）
- [ ] `Password::min(8)->mixedCase()->numbers()->symbols()` を使用している
- [ ] `Password::uncompromised()` で漏洩パスワードをチェックしている
- [ ] ログインエンドポイントにレート制限を適用している（5回/分）
- [ ] カスタムレートリミッターでメールアドレス+IPアドレスで制限している
- [ ] 本番環境では多要素認証（MFA）を導入している（推奨）
- [ ] パスワードを平文で保存していない
- [ ] MD5やSHA1でパスワードをハッシュ化していない

---

## 14. 本番環境設定

### .env ファイル

- [ ] `APP_ENV=production` に設定している
- [ ] `APP_DEBUG=false` に設定している
- [ ] `SESSION_DRIVER=database` または `redis` に設定している
- [ ] `SESSION_SECURE_COOKIE=true` に設定している
- [ ] `SESSION_SAME_SITE=lax` に設定している
- [ ] `HASH_DRIVER=argon2id` に設定している（推奨）
- [ ] `SANCTUM_STATEFUL_DOMAINS` を本番ドメインに設定している
- [ ] `SESSION_DOMAIN` をドメイン全体に設定している（`.example.com`）

### CORS設定

- [ ] `allowed_origins` を明示的に指定している（`*` を使用していない）
- [ ] `supports_credentials: true` を設定している（SPA認証使用時）
- [ ] `paths` に必要なエンドポイントのみを指定している

---

## 15. 依存関係・ライブラリ

- [ ] すべてのライブラリを最新バージョンに更新している
- [ ] `composer audit` でセキュリティ脆弱性をチェックしている
- [ ] `npm audit` でセキュリティ脆弱性をチェックしている
- [ ] 未使用のライブラリを削除している
- [ ] HTMLPurifier をインストールしている（HTML許可時）
- [ ] DOMPurify をインストールしている（React使用時）

---

## コードレビュー時のチェックポイント

コードレビュー時は以下の観点で必ず確認する。

### 1. 外部入力の検証

- [ ] すべての外部入力（URL, POST, Cookie, Header）を検証しているか
- [ ] ホワイトリスト方式を使用しているか
- [ ] Laravel Validation を使用しているか

### 2. 出力エスケープ

- [ ] Blade で `{{ }}` を使用しているか
- [ ] React で JSX のデフォルト動作を活用しているか
- [ ] HTML許可時に HTMLPurifier / DOMPurify を使用しているか

### 3. 認証・認可

- [ ] セッションから認証済みユーザーを取得しているか
- [ ] Laravel Policy で認可チェックを実装しているか
- [ ] URLパラメータからユーザーIDを取得していないか

### 4. セキュアなAPI/関数の使用

- [ ] Eloquent ORM / Query Builder を使用しているか
- [ ] `Hash::make()` でパスワードをハッシュ化しているか
- [ ] Symfony Process を使用しているか（OSコマンド実行時）
- [ ] Storage Facade を使用しているか（ファイル操作時）

### 5. セキュリティヘッダ

- [ ] SecurityHeadersMiddleware が適用されているか
- [ ] すべてのレスポンスにセキュリティヘッダが含まれているか

---

## 緊急時の対応

セキュリティインシデント発生時は以下の手順で対応する。

1. **即座にサービス停止** - 被害拡大を防ぐ
2. **ログの保全** - 攻撃の痕跡を保存
3. **脆弱性の特定と修正** - 根本原因の解決
4. **セキュリティパッチの適用** - 修正版のデプロイ
5. **影響範囲の調査** - データ漏洩等の確認
6. **関係者への報告** - 管理者・ユーザーへの通知
7. **再発防止策の実施** - プロセス改善

---

本チェックリストは定期的に見直し、新たな脅威や対策を追加する。
