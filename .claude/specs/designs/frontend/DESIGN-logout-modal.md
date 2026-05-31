# 機能仕様書: ログアウトモーダル

## 概要

既存のTopNavログアウトボタンをクリック時に、確認モーダルを表示してからログアウトを実行する。
デザインは仕様書（`memos/spec/scenes/logout/`）のGlassmorphismスタイルに基づく。
バックエンドのログアウト機能（`POST /logout`）は既に実装済み。

## 要件

### 機能要件
- [ ] TopNavのログアウトボタンクリックでモーダルを表示
- [ ] モーダルに「ログアウト」ボタンと「キャンセル」ボタンを配置
- [ ] 「ログアウト」ボタンクリックで `router.post('/logout')` を実行
- [ ] 「キャンセル」ボタンまたはオーバーレイクリックでモーダルを閉じる
- [ ] ログアウト処理中はボタンを無効化（二重送信防止）
- [ ] Escキーでモーダルを閉じる

### 非機能要件
- [ ] shadcn/ui Dialog コンポーネントを使用（アクセシビリティ対応）
- [ ] 仕様書のGlassmorphismデザインを再現
- [ ] ダークモード対応
- [ ] キーボード操作対応（Tab, Esc）
- [ ] スクリーンリーダー対応（aria属性）

## 技術設計

- **言語/フレームワーク**: React/TypeScript, Inertia.js
- **UIライブラリ**: shadcn/ui (Dialog)
- **スタイリング**: Tailwind CSS
- **ログアウト処理**: `router.post('/logout')` (Inertia)

### コンポーネント構成

```
TopNav
└── LogoutModal (新規)
    ├── Dialog (shadcn/ui)
    ├── DialogOverlay (backdrop-blur)
    ├── DialogContent (Glassmorphism)
    ├── ログアウトアイコン (Material Symbols: logout)
    ├── タイトル "LOGOUT"
    ├── 説明文
    ├── ログアウトボタン (PrimaryButton風)
    └── キャンセルボタン (テキストリンク風)
```

### デザイン仕様（仕様書準拠）

- **モーダル幅**: max-w-[360px]
- **背景**: glassmorphism（backdrop-blur-md）
- **角丸**: rounded-[2rem]
- **ボーダー**: border-white/60 (light) / border-white/10 (dark)
- **ログアウトボタン**: bg-midnight (#0F172A), 白文字, tracking-widest
- **キャンセル**: テキストリンク, hover時にborder-bottom

## 実装ステップ（Phase単位）

### Phase 0: 環境準備
- shadcn/ui の Dialog コンポーネントをインストール
- 必要な依存パッケージの確認

### Phase 1: LogoutModal コンポーネント
- LogoutModal コンポーネント（Dialog, open/close, ログアウト処理）
- デザイン仕様書に基づくスタイリング

### Phase 2: TopNav 繋ぎこみ
- TopNav のログアウトボタンをモーダルトリガーに変更
- 既存の `router.post('/logout')` をモーダル内に移動

## 完了条件
- [ ] すべてのテストがパスしている
- [ ] Quality Checks が成功している
- [ ] TopNavのログアウトボタンでモーダルが表示される
- [ ] モーダルからログアウトが正常に動作する
- [ ] ダークモード対応完了
- [ ] アクセシビリティ要件を満たしている

## 備考
- バックエンドの変更は不要（既存の `POST /logout` ルートを使用）
- Material Symbols アイコン（`logout`）は既にプロジェクトで使用中
- 仕様書のHTMLモックアップ: `memos/spec/scenes/logout/logout-modal.html`
