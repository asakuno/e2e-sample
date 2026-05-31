# 仕様インタビュー項目（自動実装用）

**AskUserQuestionTool** を使用して、以下の情報を収集してください。
一度に最大4問まで質問可能です。

**質問1: プロジェクト種別**
- question: "プロジェクトの種別を教えてください"
- header: "種別"
- multiSelect: false
- options:
  - label: "新規作成"
    description: "全く新しいプロジェクトを作成"
  - label: "既存への追加"
    description: "既存プロジェクトに機能を追加"
  - label: "リファクタリング"
    description: "既存コードの改善"

**質問2: 技術スタック**
- question: "使用する技術を選択してください（複数選択可）"
- header: "技術"
- multiSelect: true
- options:
  - label: "Backend"
    description: "Laravel/PHP バックエンド"
  - label: "Frontend"
    description: "React/TypeScript フロントエンド"
  - label: "Fullstack"
    description: "Laravel + Inertia.js フルスタック"

**質問3: コア機能**
- question: "最も重要な機能は何ですか？"
- header: "主要機能"
- multiSelect: false
- options:
  - label: "CRUD操作"
    description: "データの作成・参照・更新・削除"
  - label: "フォーム処理"
    description: "ユーザー入力の検証・保存"
  - label: "API開発"
    description: "RESTful API エンドポイント"
  - label: "UI構築"
    description: "ユーザーインターフェース"

**質問4: 成果物とテスト**
- question: "必要な成果物を選択してください（複数選択可）"
- header: "成果物"
- multiSelect: true
- options:
  - label: "実装コード"
    description: "本体のソースコード"
  - label: "テストコード (推奨)"
    description: "ユニット・機能テスト"
  - label: "ドキュメント"
    description: "README・仕様書"
