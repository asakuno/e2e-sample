# Verification Guide - Tools and Procedures

このドキュメントでは、UI/UXの品質を実際に検証するためのツールと手順を説明します。

---

## Accessibility Verification

### 1. Contrast Ratio Testing

#### Tool: WebAIM Contrast Checker
**URL**: https://webaim.org/resources/contrastchecker/

#### Procedure
1. 対象要素のテキスト色と背景色を特定
2. WebAIM Contrast Checkerに色を入力（Hex、RGB）
3. コントラスト比を確認

#### Pass Criteria
- **Normal text**: 4.5:1以上でWCAG AA Level Pass
- **Large text** (18pt以上 or 14pt bold以上): 3.1以上でPass
- **UI components**: 3:1以上でPass

#### Example
```tsx
// Text: #6B7280 (gray-400)
// Background: #F3F4F6 (gray-100)
// Ratio: 2.5:1 → FAIL

// Text: #374151 (gray-700)
// Background: #F3F4F6 (gray-100)
// Ratio: 7.8:1 → PASS
```

### 2. Chrome DevTools Accessibility Check

#### Procedure
1. Chrome DevTools を開く (F12)
2. Lighthouse タブに移動
3. "Accessibility" をチェック
4. "Generate report" をクリック

#### Pass Criteria
- **Score**: 90以上
- **Contrast issues**: 0件
- **ARIA issues**: 0件
- **Names and labels**: すべて適切

### 3. Keyboard Navigation Testing

#### Manual Test Procedure
1. **Tab**キーを押下してページを順次移動
2. すべてのインタラクティブ要素に到達できることを確認
3. **Enter**または**Space**キーで要素をアクティブ化
4. **Shift+Tab**で逆順移動を確認
5. **Esc**キーでモーダル/ドロップダウンを閉じられることを確認

#### Pass Criteria
- [ ] すべてのボタン、リンク、フォーム要素にTabでアクセス可能
- [ ] フォーカス時に視覚的なフォーカスリングが表示される
- [ ] 論理的な順序でフォーカスが移動する
- [ ] Enterでボタンがアクティブ化される
- [ ] Escapeでモーダルが閉じる

#### Common Failures
```tsx
// ❌ FAIL: No focus indicator
<button className="outline-none">
  Submit
</button>

// ✅ PASS: Visible focus ring
<button className="focus:ring-2 focus:ring-blue-500">
  Submit
</button>
```

### 4. Screen Reader Testing

#### Tools
- **Windows**: NVDA (https://www.nvaccess.org/)
- **macOS**: VoiceOver (built-in, Cmd+F5)
- **Linux**: Orca

#### Basic Test Procedure (NVDA)
1. NVDAを起動
2. ページをリロード
3. **↓**キーでページを順次読み上げ
4. **Tab**キーでインタラクティブ要素に移動
5. 以下を確認：
   - フォームラベルが読み上げられるか
   - エラーメッセージが読み上げられるか
   - ボタンの目的が理解できるか

#### Pass Criteria
- [ ] すべてのフォーム要素にラベルがある
- [ ] エラーメッセージが`role="alert"`で読み上げられる
- [ ] 画像に適切な`alt`テキストがある
- [ ] ボタンのテキストが目的を明確に示している

---

## Performance Verification

### 1. Lighthouse Performance Test

#### Procedure
1. Chrome DevTools → Lighthouse タブ
2. "Performance" をチェック
3. "Desktop" または "Mobile" を選択
4. "Generate report" をクリック

#### Pass Criteria
| Metric | Target | Critical |
|--------|--------|----------|
| Performance Score | 90+ | ✅ |
| LCP | < 2.5s | ✅ |
| FID | < 100ms | ✅ |
| CLS | < 0.1 | ✅ |
| TBT | < 200ms | ⚠️ |
| Speed Index | < 3.4s | ⚠️ |

### 2. Core Web Vitals Measurement

#### Chrome DevTools Performance Tab
1. DevTools → Performance タブ
2. **Record**（●）をクリック
3. ページをリロード
4. 数秒後に**Stop**をクリック
5. "Web Vitals" セクションを確認

#### Field Data (Real User Monitoring)
- Chrome User Experience Report (CrUX)
- Google Search Console → Core Web Vitals

### 3. Image Optimization Verification

#### Check List
```tsx
// ❌ FAIL: No dimensions
<img src="/hero.jpg" alt="Hero" />

// ✅ PASS: Dimensions specified
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
/>
```

#### Verification Steps
1. DevTools → Network タブ
2. ページをリロード
3. 画像ファイルを確認：
   - [ ] サイズが適切（Desktop: <500KB、Mobile: <200KB）
   - [ ] WebPまたはAVIFフォーマット
   - [ ] `width`と`height`が指定されている（CLS回避）
   - [ ] Above-the-fold画像に`priority`属性

### 4. Layout Shift Detection

#### Procedure
1. DevTools → Performance タブ
2. **Record** → ページリロード → **Stop**
3. "Experience" セクションの "Layout Shifts" を確認

#### Pass Criteria
- **CLS**: < 0.1
- **Layout shifts**: 0回（理想）
- すべての画像に`width`と`height`指定

#### Common Causes
- 画像にdimensionsがない
- Webフォントのロード（FOUT/FOIT）
- 動的に挿入される広告・コンテンツ

---

## Responsive Verification

### 1. Chrome DevTools Device Mode

#### Procedure
1. DevTools → Device Toolbar をオン（Ctrl+Shift+M / Cmd+Shift+M）
2. 以下のビューポート幅でテスト：
   - **375px** - iPhone SE
   - **640px** - sm breakpoint
   - **768px** - md breakpoint (iPad)
   - **1024px** - lg breakpoint (Laptop)
   - **1920px** - Full HD Desktop

#### Check List
- [ ] **375px**: コンテンツがすべて表示される（横スクロールなし）
- [ ] **640px**: レイアウトが適切に調整される
- [ ] **768px**: タブレット向けレイアウト
- [ ] **1024px**: デスクトップレイアウト
- [ ] **1920px**: 最大幅が適切に制限される

### 2. Touch Target Verification

#### Measurement Tool
Chrome DevTools → Elements → Computed タブ → Box Model

#### Procedure
1. ボタン・リンクを選択
2. Computed タブで実際のサイズを確認
3. **44x44px以上**であることを確認

```tsx
// ❌ FAIL: Too small (32x32px)
<button className="p-2">
  <Icon className="w-4 h-4" />
</button>

// ✅ PASS: 44x44px minimum
<button className="min-h-[44px] min-w-[44px] p-2">
  <Icon className="w-4 h-4" />
</button>
```

### 3. Responsive Images Check

#### Procedure
1. DevTools → Network タブ
2. Device Toolbar で異なるビューポートを選択
3. 画像の読み込みサイズを確認

#### Pass Criteria
- [ ] Mobile (375px): 小さい画像が読み込まれる
- [ ] Desktop (1920px): 大きい画像が読み込まれる
- [ ] `srcSet`が適切に設定されている

---

## Animation Verification

### 1. Performance Impact Check

#### Procedure
1. DevTools → Performance タブ
2. **Record** → アニメーションをトリガー → **Stop**
3. "Main" セクションで以下を確認：
   - Layout (Reflow) が発生していないか
   - Paint が最小限か

#### Pass Criteria
- [ ] `transform`と`opacity`のみアニメーション
- [ ] 60fps を維持（Frame rendering: 16ms以下）
- [ ] Layout (Reflow) が発生していない

```tsx
// ❌ FAIL: Triggers layout
<div className="hover:w-64 transition-all">

// ✅ PASS: GPU-accelerated
<div className="hover:scale-105 transition-transform">
```

### 2. Timing Verification

#### Measurement
```css
/* DevTools → Elements → Computed → transition */
transition: transform 300ms ease-in-out;
```

#### Pass Criteria
- **Standard**: 200-300ms
- **Complex**: 300-500ms
- **Maximum**: 500ms

### 3. Reduced Motion Check

#### Procedure
1. OS設定で "Reduce motion" を有効化
   - **Windows**: Settings → Accessibility → Visual effects
   - **macOS**: System Preferences → Accessibility → Display
2. ページをリロード
3. アニメーションが無効化されることを確認

```tsx
// ✅ PASS: Respects user preference
<div className="motion-safe:animate-in motion-reduce:opacity-100">
```

---

## Form Verification

### 1. ARIA Attributes Check

#### Procedure
1. DevTools → Elements → フォーム要素を選択
2. Attributes を確認

#### Required Attributes
```html
<!-- Input with error -->
<input
  id="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" role="alert">Invalid email</p>
```

#### Check List
- [ ] `aria-invalid` が設定されている（エラー時）
- [ ] `aria-describedby` がエラーメッセージを参照している
- [ ] `aria-required` または `required` が設定されている
- [ ] エラーメッセージに `role="alert"`

### 2. Label Association Check

#### Procedure
1. DevTools → Elements → input要素を選択
2. `htmlFor`/`id` の関連を確認

```tsx
// ✅ PASS: Proper association
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

#### Test
- ラベルテキストをクリックして、inputにフォーカスが移るか確認

---

## Feedback Verification

### 1. Loading State Timing

#### Procedure
1. DevTools → Network タブ
2. "Slow 3G" に設定
3. フォーム送信・ボタンクリックをテスト
4. ローディングインジケーターが**即座に**表示されるか確認

#### Pass Criteria
- [ ] ローディング状態が即座に表示（< 100ms）
- [ ] ボタンが`disabled`になる
- [ ] 視覚的なインジケーター（スピナー）が表示

### 2. Button States Check

#### Required States
```tsx
<Button
  className={cn(
    // Default
    'bg-blue-600 text-white',
    // Hover
    'hover:bg-blue-700',
    // Active
    'active:bg-blue-800',
    // Focus
    'focus:ring-2 focus:ring-blue-500',
    // Disabled
    'disabled:opacity-50 disabled:cursor-not-allowed'
  )}
  disabled={isLoading}
>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>
```

#### Check List
- [ ] **Hover**: 色が変わる
- [ ] **Active**: クリック時に変化
- [ ] **Focus**: フォーカスリングが表示
- [ ] **Loading**: スピナーが表示、ボタンが無効化
- [ ] **Disabled**: 視覚的に無効であることが明確

---

## Semantic HTML Verification

### 1. Accessibility Tree Check

#### Procedure
1. DevTools → Elements タブ
2. 右下の "Accessibility" ペインを開く
3. 構造を確認

#### Pass Criteria
- [ ] `<header>` が最上部にある
- [ ] `<nav>` がナビゲーションに使われている
- [ ] `<main>` がメインコンテンツに使われている（1つのみ）
- [ ] `<footer>` が最下部にある
- [ ] 見出しが階層的（h1 → h2 → h3）

### 2. Heading Structure Check

#### Tool: HeadingsMap Extension
**URL**: https://chrome.google.com/webstore (HeadingsMapで検索)

#### Pass Criteria
- [ ] `<h1>` は1つのみ
- [ ] 見出しレベルがスキップされていない（h1 → h3など）
- [ ] すべてのセクションに適切な見出しがある

---

## Comprehensive Test Workflow

### Phase 1: Planning
1. **Accessibility**: コントラスト比、タッチターゲットサイズを計画
2. **Performance**: パフォーマンスバジェット設定（LCP < 2.5s）
3. **Responsive**: ブレークポイント戦略決定

### Phase 4: Verification
1. **Lighthouse**: すべてのスコア90+を確認
2. **Keyboard**: Tabキーでの完全ナビゲーションをテスト
3. **Responsive**: 5つのブレークポイントでテスト
4. **Contrast**: WebAIM Checkerで検証
5. **Performance**: LCP、CLS、FIDを測定
6. **Animation**: GPU最適化を確認
7. **Forms**: ARIA属性を検証
8. **Semantic**: Accessibility Treeを確認

---

## Quick Verification Checklist

### Before Implementation (Phase 1)
- [ ] コントラスト比を計画（4.5:1以上）
- [ ] タッチターゲットサイズを計画（44x44px以上）
- [ ] パフォーマンスバジェット設定
- [ ] レスポンシブブレークポイント決定

### After Implementation (Phase 4)
- [ ] **Lighthouse実行** → すべて90+
- [ ] **Keyboard navigation** → Tab/Shift+Tab でテスト
- [ ] **5 breakpoints** → 375px, 640px, 768px, 1024px, 1920px
- [ ] **Contrast check** → WebAIM Checker
- [ ] **Performance** → LCP < 2.5s, CLS < 0.1
- [ ] **Animation** → transform/opacityのみ
- [ ] **ARIA attributes** → すべてのフォームに設定
- [ ] **Semantic HTML** → header/nav/main/footer

---

## Tools Summary

| Category | Tool | URL |
|----------|------|-----|
| **Contrast** | WebAIM Contrast Checker | https://webaim.org/resources/contrastchecker/ |
| **Performance** | Chrome DevTools Lighthouse | Built-in (F12 → Lighthouse) |
| **Accessibility** | Chrome DevTools Accessibility | Built-in (F12 → Elements → Accessibility) |
| **Screen Reader** | NVDA | https://www.nvaccess.org/ |
| **Headings** | HeadingsMap Extension | Chrome Web Store |
| **Performance** | WebPageTest | https://www.webpagetest.org/ |

**Remember**: "Did I actually test this with tools, or am I assuming?" - If you didn't test, it's not verified.
