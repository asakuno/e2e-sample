# DESIGN: ユーザー新規登録画面（フロントエンド）

## 概要

既存のログイン画面（Login.tsx）と同じパターンに従い、ユーザー新規登録画面を実装する。
バックエンドは実装済み（RegisterRequest, RegisterUserUseCase, AuthPageController）。

## デザイン仕様

スクリーンショットに基づく画面構成:

### レイアウト
- GuestLayout 使用（ログイン画面と同一）
- カード形式の中央配置フォーム

### フォーム要素
1. **タイトル**: 「新規会員登録」（太字、中央揃え）
2. **サブタイトル**: 「アカウントを作成してサービスを開始しましょう」（グレー、中央揃え）
3. **お名前フィールド**: InputField コンポーネント、placeholder: "田中 太郎"
4. **メールアドレスフィールド**: InputField コンポーネント、type: email、placeholder: "example@mail.com"
5. **パスワードフィールド**: PasswordInput コンポーネント、placeholder: "8文字以上の英数字"
6. **パスワード（確認用）フィールド**: PasswordInput コンポーネント、placeholder: "パスワードを再入力"
7. **利用規約同意テキスト**: 「アカウントを作成する」をクリックすることで、弊社の利用規約およびプライバシーポリシーに同意したものとみなされます。
   - 利用規約リンク: `href="#"`（未実装）
   - プライバシーポリシーリンク: `href="#"`（未実装）
8. **送信ボタン**: PrimaryButton「アカウントを作成する」
9. **区切り線**: hr（ボタンとフッターリンクの間）
10. **フッターリンク**: 「既にアカウントをお持ちの方はこちら →」→ `/login` へ遷移

### バリデーション
- Inertia useForm + withPrecognition('post', '/register') によるリアルタイムバリデーション
- onBlur でフィールド単位のバリデーション実行
- エラーメッセージは各フィールド直下に赤字表示（既存InputField/PasswordInputの機能）

### 登録成功後
- バックエンドが `/email/verify` にリダイレクト（メール認証ページ）
- フロントエンドは Inertia の自動リダイレクトに従う

## 技術設計

### 使用コンポーネント
- `@inertiajs/react`: `Head`, `Link`, `useForm`
- `@/components/ui/InputField`: 名前・メール入力
- `@/components/ui/PasswordInput`: パスワード入力（表示切替付き）
- `@/components/ui/PrimaryButton`: 送信ボタン
- `@/layouts/GuestLayout`: ゲスト用レイアウト

### フォームデータ
```typescript
{
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}
```

### Precognition
```typescript
const form = useForm({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
}).withPrecognition('post', '/register');
```

## 実装ステップ（Phase単位）

### Phase 1: Register.tsx ページコンポーネント
- Register.tsx の作成（GuestLayout、フォーム、バリデーション）
- 全UIを一括実装（コンポーネントは既存のものを再利用）

### Phase 2: テスト
- Register.test.tsx の作成（Vitest + RTL）
- レンダリング、フォーム操作、バリデーション表示のテスト

## 完了条件

- [ ] Register.tsx が正しくレンダリングされる
- [ ] Precognition によるリアルタイムバリデーションが動作する
- [ ] yarn typecheck パス
- [ ] yarn check（Biome）パス
- [ ] yarn test パス
- [ ] yarn build:all パス
