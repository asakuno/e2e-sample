---
name: ui-design-guidelines
description: UI/UX design guidelines focusing on what AI commonly overlooks or fails to verify. **CRITICAL**: Emphasizes concrete checklists, measurement criteria, and verification steps that AI tends to skip during design reviews. Reference during Phase 1 (UI/UX Design Review).
---

# UI/UX Design Guidelines - What AI Overlooks

このスキルは、AIが一貫して見落とす具体的な検証ステップに焦点を当てています。一般的なデザイン原則についてはAIを信頼し、AIが確実にチェックに失敗する重要な領域を精査してください。

---

## How to Use This Skill

### Quick Reference - Phase 1 & 4

**Phase 1（実装前）:**
- [ ] Critical Checklistで要件を特定
- [ ] AIが見落とす検証項目を把握（コントラスト比、ARIA属性、パフォーマンス）

**Phase 4（実装後）:**
- [ ] [Verification Guide](references/verification-guide.md) で実測検証
- [ ] [AI Oversights Detailed](references/ai-oversights-detailed.md) で具体例を確認

---

## Quick Reference: Critical Checklist

### ⚠️ Accessibility（最重要）
- [ ] **Contrast tested**: 4.5:1（text）、3:1（UI components）
- [ ] **Touch targets**: 44x44px minimum
- [ ] **Keyboard tested**: Tab/Shift+Tabで完全ナビゲーション
- [ ] **Focus visible**: すべてのインタラクティブ要素に明確なフォーカスリング
- [ ] **ARIA attributes**: フォームに`aria-invalid`、`aria-describedby`
- [ ] **Semantic HTML**: `<header>`, `<nav>`, `<main>`, `<footer>`使用

### ⚠️ Performance
- [ ] **Images**: Next.js Imageで`width`/`height`指定
- [ ] **Priority**: Above-the-fold画像に`priority`属性
- [ ] **Lighthouse**: すべてのスコア90+
- [ ] **LCP**: < 2.5s verified
- [ ] **CLS**: < 0.1 verified（レイアウトシフトなし）

### ⚠️ Responsive
- [ ] **375px tested**: 最小モバイル幅
- [ ] **640px, 768px, 1024px, 1920px tested**: 各ブレークポイント
- [ ] **No overflow**: すべてのコンテンツが表示される
- [ ] **Touch targets**: すべてのブレークポイントで44x44px+

### Animation
- [ ] **Properties**: `transform`と`opacity`のみ
- [ ] **Timing**: 200-500ms maximum
- [ ] **Reduced motion**: `prefers-reduced-motion`を尊重

### Forms
- [ ] **Labels**: すべてのinputに`htmlFor`/`id`
- [ ] **Errors**: `aria-describedby`がエラーメッセージを参照
- [ ] **Validation**: `aria-invalid`がステータスを反映

### Feedback
- [ ] **Loading states**: すべての非同期操作にインジケーター表示
- [ ] **Button states**: disabled, loading, hover, active, focus
- [ ] **Timing**: 0.4秒以内にフィードバック

---

## Critical Numbers

### Contrast Ratios
- **Normal text**: 4.5:1
- **Large text** (≥18pt/≥14pt bold): 3:1
- **UI components**: 3:1

### Touch Targets
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

## When to Use

### Phase 1: UI/UX Design Review
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

### Phase 4: Browser Verification
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

## Summary: What to Watch For

### Trust AI for:
- Visual hierarchy concepts
- Color theory basics
- Typography principles
- General UX guidelines

### Scrutinize AI for:
- **Actual measurements**（contrast, size, timing）
- **Testing at breakpoints**（375px - 1920px）
- **ARIA attribute implementation**
- **GPU-accelerated animation properties**
- **Performance metric verification**

### The Golden Rule
**"Did I actually test this with tools, or am I assuming?"**

If you didn't:
- Run Lighthouse
- Test keyboard navigation
- Verify at multiple breakpoints
- Measure contrast ratios

...then the implementation is **incomplete**.

---

## References

詳細なパターン、コード例、検証手順は以下を参照：

### `references/ai-oversights-detailed.md`
- Generic AI Aestheticsの詳細（フォント・色・レイアウト）
- 8つの領域すべての具体的なコード例（❌/✅パターン）
- アンチパターンと推奨パターン

### `references/verification-guide.md`
- 検証ツールの使用方法（WebAIM, Lighthouse, NVDA）
- ステップバイステップの検証手順
- 各領域のPass Criteria
- トラブルシューティング
