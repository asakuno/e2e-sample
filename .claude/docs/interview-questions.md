# 仕様インタビュー項目

以下の質問をAskUserQuestionToolで実施してください（1回の呼び出しで最大4問）：

**質問1: プロジェクト種別**
- question: "このプロジェクトの種別を教えてください"
- header: "種別"
- multiSelect: false
- options:
  - label: "新規プロジェクト"
    description: "全く新しいプロジェクトを作成"
  - label: "既存への機能追加"
    description: "既存プロジェクトに新機能を追加"
  - label: "リファクタリング"
    description: "既存コードの改善・再構築"

**質問2: 技術要件**
- question: "使用する技術スタックを選択してください（複数選択可）"
- header: "技術"
- multiSelect: true
- options:
  - label: "Laravel/PHP"
    description: "バックエンドフレームワーク"
  - label: "React/TypeScript"
    description: "フロントエンドフレームワーク"
  - label: "Inertia.js"
    description: "フルスタック連携"

**質問3: コア機能**
- question: "最も重要な機能は何ですか？"
- header: "主要機能"
- multiSelect: false
- options:
  - label: "データCRUD"
    description: "データの作成・参照・更新・削除"
  - label: "認証/認可"
    description: "ユーザー認証とアクセス制御"
  - label: "API連携"
    description: "外部サービスとの連携"
  - label: "レポート/分析"
    description: "データ分析・可視化機能"

**質問4: 優先事項**
- question: "最も重視する要件は何ですか？"
- header: "優先度"
- multiSelect: false
- options:
  - label: "開発スピード (推奨)"
    description: "MVP早期リリース優先"
  - label: "コード品質"
    description: "テストカバレッジ・保守性重視"
  - label: "パフォーマンス"
    description: "高速化・最適化優先"

ユーザーの回答が不十分な場合は、追加で質問を行ってください。
