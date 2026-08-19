---
name: ui-design-guidelines
description: Comprehensive UI/UX design guidelines covering visual design (typography, color, motion), user experience (cognitive psychology, interaction patterns, mental models), Sociomedia's Human Interface Guidelines (100 principles), and concrete checklists for what AI commonly overlooks. Reference during Phase 1 (UI/UX Design Review) and Phase 4 (Browser Verification).
---

# UI/UX Design Guidelines

For an explicit anti-AI-slop, visual cliché, excessive-card, or design-system
visual drift audit, load `product-ui-slop-audit` after this skill. Do not duplicate
its named-finding report in the general UI/UX review.

## Required References

このスキルを読み込んだ後、以下のファイルをReadツールで読み込むこと。

**条件付き - Phase 1（UI/UXデザインレビュー）**:
読み込みタイミング: 以下のいずれかに該当する場合
- `plan-reviewer` エージェントの実行時
- ユーザーが「UI/UXデザインレビュー」「UIレビュー」「デザイン確認」を明示的に要求した場合
- 新規画面・コンポーネントの設計レビューを行う場合
- AGENTS.md の Phase 1 に記載された UI/UX 関連タスク実行時

参照ファイル:
- `references/ui-design.md` - ビジュアルデザイン原則（タイポグラフィ、カラー、モーション、4pxグリッド）
- `references/ux-design.md` - UX原則（メンタルモデル、認知心理学、43の心理原則）
- `references/hi-design.md` - Sociomedia HI ガイドライン（100項目: フォーム設計、OOUI、アクセシビリティ等）

**条件付き - Phase 4（ブラウザ検証）**:
読み込みタイミング: 以下のいずれかに該当する場合
- Chrome DevTools MCP を使用したブラウザ検証を行う場合
- ユーザーが「ブラウザ確認」「UI確認」「アクセシビリティチェック」を要求した場合
- 実装後のビジュアル/パフォーマンス確認を行う場合

参照ファイル:
- `references/verification-guide.md` - 検証ツール手順（WebAIM, Lighthouse, NVDA）

**条件付き - その他**:
- `references/ai-oversights-detailed.md` - 読み込み条件:
  - AI が生成したUIの品質改善を行う場合
  - 「AIっぽいデザイン」の回避方法を確認する場合
  - 具体的なコード例が必要な場合

---

このスキルは、3つの視点からUIデザインを総合的にガイドします：

1. **AIが見落とすポイント**（本ファイル）: 具体的な検証ステップ、計測基準、チェックリスト
2. **ビジュアルデザイン原則** (`references/ui-design.md`): タイポグラフィ、カラー、モーション、空間構成
3. **UXデザイン原則** (`references/ux-design.md`): 認知心理学、インタラクションパターン、メンタルモデル
4. **ヒューマンインターフェースガイドライン** (`references/hi-design.md`): Sociomedia 100原則

---

## How to Use This Skill

### Quick Reference - Phase 1 & 4

**Phase 1（実装前）:**
- [ ] Critical Checklistで要件を特定
- [ ] AIが見落とす検証項目を把握（コントラスト比、ARIA属性、パフォーマンス）
- [ ] [UI Design](references/ui-design.md) でビジュアルデザイン方針を確認
- [ ] [UX Design](references/ux-design.md) でインタラクションパターンと心理原則を確認
- [ ] [HI Design](references/hi-design.md) でヒューマンインターフェース原則を確認

**Phase 4（実装後）:**
- [ ] [Verification Guide](references/verification-guide.md) で実測検証
- [ ] [AI Oversights Detailed](references/ai-oversights-detailed.md) で具体例を確認

---

## 検証チェックリスト

### ⚠️ アクセシビリティ（最重要）
- [ ] **Contrast tested**: 4.5:1（text）、3:1（UI components）
- [ ] **Touch targets**: 44x44px minimum
- [ ] **Keyboard tested**: Tab/Shift+Tabで完全ナビゲーション
- [ ] **Focus visible**: すべてのインタラクティブ要素に明確なフォーカスリング
- [ ] **ARIA attributes**: フォームに`aria-invalid`、`aria-describedby`
- [ ] **Semantic HTML**: `<header>`, `<nav>`, `<main>`, `<footer>`使用

### ⚠️ パフォーマンス
- [ ] **Images**: `width`/`height`指定、遅延読み込み設定
- [ ] **Priority**: Above-the-fold画像の優先読み込み
- [ ] **Lighthouse**: すべてのスコア90+
- [ ] **LCP**: < 2.5s verified
- [ ] **CLS**: < 0.1 verified（レイアウトシフトなし）

### ⚠️ レスポンシブ
- [ ] **375px tested**: 最小モバイル幅
- [ ] **640px, 768px, 1024px, 1920px tested**: 各ブレークポイント
- [ ] **No overflow**: すべてのコンテンツが表示される
- [ ] **Touch targets**: すべてのブレークポイントで44x44px+

### アニメーション
- [ ] **Properties**: `transform`と`opacity`のみ
- [ ] **Timing**: 200-500ms maximum
- [ ] **Reduced motion**: `prefers-reduced-motion`を尊重

### フォーム
- [ ] **Labels**: すべてのinputに`htmlFor`/`id`
- [ ] **Errors**: `aria-describedby`がエラーメッセージを参照
- [ ] **Validation**: `aria-invalid`がステータスを反映

### フィードバック
- [ ] **Loading states**: すべての非同期操作にインジケーター表示
- [ ] **Button states**: disabled, loading, hover, active, focus
- [ ] **Timing**: 0.4秒以内にフィードバック

---

## 計測基準値

### コントラスト比
- **Normal text**: 4.5:1
- **Large text** (≥18pt/≥14pt bold): 3:1
- **UI components**: 3:1

### タッチターゲット
- **Minimum size**: 44x44px
- **Spacing**: 8px minimum

### Performance
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **Feedback**: < 0.4s（Doherty Threshold）

### Animation
- **Standard**: 200-300ms
- **Complex**: 300-500ms
- **Maximum**: 500ms
- **Properties**: `transform`, `opacity` only

### Responsive
- **Test range**: 375px - 1920px
- **Breakpoints**: 640, 768, 1024, 1280

### Typography
- **Base**: 16px minimum
- **Line height**: 1.5-1.6（body）, 1.2-1.4（headings）
- **Line length**: 45-75 characters（max-w-prose）

### Spacing
- **Base unit**: 4px or 8px
- **Minimum padding**: 16px（interactive elements）
- **Section spacing**: 32-96px

---

## AI's Common Oversights（概要）

AIは以下の領域で一貫して検証を省略します。詳細とコード例は `references/ai-oversights-detailed.md` を参照してください。

### 1. Generic AI Aesthetics（最重要）
**Pattern**: 予測可能で「安全な」デザイン選択

**絶対に避けるべきAIデフォルト**:
- ❌ Inter/Roboto/Arialフォント
- ❌ 白地に紫グラデーション
- ❌ 中央揃えヒーロー + 3カラムグリッド

**Principle**: 明確な美学的方向性を選択し、意図的に実行する。

### 2. Accessibility Verification
**Pattern**: 実装後にコントラスト比とキーボードナビゲーションを実測しない

**Critical**: WebAIM Contrast Checkerで実測、Tabキーで実際にテスト

### 3. Performance Measurement
**Pattern**: パフォーマンス検証手順を提供しない

**Critical**: Lighthouse実行、LCP/CLS/FIDを測定

### 4. Responsive Testing Range
**Pattern**: 特定のブレークポイントでテストしない

**Critical**: 375px, 640px, 768px, 1024px, 1920pxで実測

### 5. Animation Constraints
**Pattern**: GPU最適化されたプロパティのみを使用しない

**Critical**: `transform`と`opacity`のみアニメーション（width/heightは禁止）

### 6. Form Accessibility
**Pattern**: 適切なARIA属性を省略

**Critical**: `aria-invalid`, `aria-describedby`, `role="alert"`を設定

### 7. Semantic HTML
**Pattern**: divの代わりに適切な要素を使用しない

**Critical**: `<header>`, `<nav>`, `<main>`, `<article>`, `<footer>`使用

### 8. Feedback Timing
**Pattern**: 0.4秒未満のフィードバックを保証しない

**Critical**: 即座のローディング状態表示、Doherty Threshold（0.4s）遵守

---

## Phase別適用ガイド

### Phase 1: UI/UXデザインレビュー
**Objective**: 実装前に要件を特定し、計画する

**Actions**:
1. Quick Referenceチェックリストを確認
2. アクセシビリティ要件を特定（コントラスト、タッチターゲット）
3. レスポンシブブレークポイントを計画
4. パフォーマンスバジェットを定義（LCP < 2.5s）
5. Generic AI Aesthetics チェックリストを確認（フォント・色・レイアウト）

**Deliverables**:
- アクセシビリティ要件リスト
- レスポンシブブレークポイント戦略
- パフォーマンスバジェット

### Phase 4: ブラウザ検証
**Objective**: 実装後に実測検証

**Actions**:
1. **Lighthouse実行** → すべてのスコア90+を確認
2. **Keyboard navigation** → Tab/Shift+Tabで完全テスト
3. **Responsive test** → 5つのブレークポイント（375px, 640px, 768px, 1024px, 1920px）
4. **Contrast check** → WebAIM Checkerで測定
5. **Performance** → LCP < 2.5s, CLS < 0.1, FID < 100ms
6. **Animation** → `transform`/`opacity`のみ使用確認
7. **ARIA attributes** → すべてのフォームに設定確認
8. **Semantic HTML** → Accessibility Tree確認

**Tools**: `references/verification-guide.md` で詳細な手順を参照

**Pass Criteria**:
- すべてのチェックリスト項目が✅
- Lighthouseスコア90+
- 実測値がCritical Numbersを満たす

---

## まとめ: AIの信頼と検証の使い分け

### AIに任せてよい領域:
- ビジュアル階層の概念
- 色彩理論の基礎
- タイポグラフィ原則
- 一般的なUXガイドライン

### AIの出力を実測検証すべき領域:
- **実測値**（コントラスト比、サイズ、タイミング）
- **ブレークポイント別テスト**（375px - 1920px）
- **ARIA属性の実装**
- **GPU最適化アニメーションプロパティ**
- **パフォーマンス指標の検証**

### 黄金ルール
**「ツールで実際にテストしたか、それとも仮定しているだけか？」**

以下を実行していなければ、実装は**未完了**:
- Lighthouse実行
- キーボードナビゲーションテスト
- 複数ブレークポイントでの検証
- コントラスト比の測定

---

## 参照ドキュメント

| ファイル | 内容 |
|---------|------|
| `references/ai-oversights-detailed.md` | AI Aesthetics詳細、8領域のコード例（❌/✅パターン） |
| `references/verification-guide.md` | 検証ツール手順（WebAIM, Lighthouse, NVDA） |
| `references/ui-design.md` | ビジュアルデザイン原則（タイポグラフィ、カラー、モーション、4pxグリッド） |
| `references/ux-design.md` | UX原則（メンタルモデル、認知心理学、43の心理原則） |
| `references/hi-design.md` | Sociomedia HI ガイドライン（100項目: フォーム設計、OOUI、アクセシビリティ等） |

**重要**: ビジュアル・UX・HIの3ドキュメントを併用すること。
