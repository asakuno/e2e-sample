# PLAN: ユーザー新規登録画面（フロントエンド）

## 概要

Login.tsx と同一パターンで Register.tsx を実装する。
バックエンドは実装済み（POST /register）。既存コンポーネントを再利用。

## 前提

- 再利用コンポーネント: `InputField`, `PasswordInput`, `PrimaryButton`, `GuestLayout`
- フォーム: `useForm` + `withPrecognition('post', '/register')`
- テストパターン: Login.test.tsx と同一構造

## Phase 1: Register.tsx ページコンポーネント

### RED: テスト作成

**ファイル**: `resources/js/pages/Auth/__tests__/Register.test.tsx`

Login.test.tsx と同一パターンで以下のテストを作成:

1. お名前入力欄が表示されること
2. メールアドレス入力欄が表示されること
3. パスワード入力欄が表示されること
4. パスワード（確認用）入力欄が表示されること
5. 「アカウントを作成する」ボタンが表示されること
6. 利用規約テキストが表示されること
7. 「既にアカウントをお持ちの方はこちら」リンクが表示され href="/login" であること
8. フォーム送信で submit が呼ばれること
9. ページタイトルが「新規会員登録」であること

**Inertia モック**: Login.test.tsx と同一パターン（useForm → withPrecognition チェーン）
- `data: { name: '', email: '', password: '', password_confirmation: '' }`

```bash
git commit -m "test(register): Register画面テスト作成 (RED)

- レンダリングテスト（全フォーム要素）
- フォーム送信テスト
- ページタイトルテスト"
```

### GREEN: 最小実装

**ファイル**: `resources/js/pages/Auth/Register.tsx`

Login.tsx と同一構造で実装:

```typescript
// フォーム初期化
const form = useForm({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
}).withPrecognition('post', '/register');

const { data, setData, submit, processing, errors, validate } = form;
```

**UI構成**:
1. `<Head title="新規会員登録" />`
2. `<GuestLayout>` でラップ
3. タイトル「新規会員登録」+ サブタイトル
4. InputField x2（名前、メール）
5. PasswordInput x2（パスワード、確認）
6. 利用規約テキスト（リンク付き）
7. PrimaryButton「アカウントを作成する」
8. 区切り線 + フッターリンク（`/login`）

各フィールドに `onBlur={() => validate('fieldName')}` を設定。

```bash
git commit -m "feat(register): Register画面実装完了 (GREEN)

- GuestLayout + Inertia useForm + Precognition
- 4フィールドフォーム（名前、メール、パスワード、確認）
- リアルタイムバリデーション（onBlur）
- 利用規約テキスト、フッターリンク"
```

### REFACTOR: 品質改善

- Biome lint/format 適用
- typecheck 確認
- テスト全件パス確認

```bash
git commit -m "refactor(register): Register画面リファクタリング (REFACTOR)

- Biome lint/format適用
- コード品質改善"
```

## Phase 2: ルーティング確認

バックエンド側で既に `/register` GET ルートが `AuthPageController@register` にマッピングされていることを確認。
Inertia::render('Auth/Register') で Register.tsx が読み込まれることを確認。

**注意**: ルーティングが未設定の場合のみ追加作業が発生する。

## Quality Checks

```bash
docker compose exec app yarn typecheck && docker compose exec app yarn check && docker compose exec app yarn test && docker compose exec app yarn build:all
```

## 完了条件

- [ ] Register.test.tsx の全テストがパス
- [ ] Register.tsx が正しくレンダリングされる
- [ ] Precognition によるリアルタイムバリデーション設定済み
- [ ] yarn typecheck パス
- [ ] yarn check（Biome）パス
- [ ] yarn test パス
- [ ] yarn build:all パス

## コミット計画

| # | タイプ | メッセージ |
|---|--------|-----------|
| 1 | test | `test(register): Register画面テスト作成 (RED)` |
| 2 | feat | `feat(register): Register画面実装完了 (GREEN)` |
| 3 | refactor | `refactor(register): Register画面リファクタリング (REFACTOR)` |
