# AI's Common Oversights - Detailed Patterns

このドキュメントでは、AIが設計・実装時に見落としがちな7つの重要な領域について、具体的なコード例とアンチパターンを示します。

---

## 1. Generic AI Aesthetics（最重要）

### Pattern AI ALWAYS falls into
AIは予測可能で「安全な」デザイン選択を行い、クッキーカッター的なインターフェースを生成します。

### ❌ NEVER use these AI defaults

#### Overused Fonts
**AI's go-to choices:**
- Inter, Roboto, Arial - AIの定番選択
- System fonts - 怠惰なデフォルト
- Space Grotesk - AI生成で使いすぎ

```tsx
// ❌ AI writes: Generic font stack
<h1 className="font-['Inter']">Heading</h1>

// ✅ Better: Distinctive, contextual fonts
<h1 className="font-['Playfair_Display']">Heading</h1>
// 意外性があり、特徴的なフォントで美学を高める
```

#### Cliched Color Schemes
**AI's predictable patterns:**
- Purple gradients on white backgrounds - 使いすぎ
- Blue-to-purple gradients - 一般的なSaaS美学
- Evenly-distributed palettes - 臆病な色選択

```tsx
// ❌ AI writes: Generic purple gradient
<div className="bg-gradient-to-r from-purple-500 to-blue-500">
  Content
</div>

// ✅ Better: Bold, contextual color choices
<div className="bg-amber-900 text-amber-50">
  Content
</div>
// 支配的な色を使って、一貫した美学にコミットする
```

#### Predictable Layouts
**AI's default patterns:**
- Centered hero sections - デフォルトパターン
- Three-column feature grids - クッキーカッター構造
- Symmetric, safe compositions - 視覚的興味なし

```tsx
// ❌ AI writes: Generic centered layout
<section className="container mx-auto text-center">
  <h1>Hero Title</h1>
  <div className="grid grid-cols-3 gap-4">
    <Card>Feature 1</Card>
    <Card>Feature 2</Card>
    <Card>Feature 3</Card>
  </div>
</section>

// ✅ Better: Unexpected, asymmetric layouts
<section className="grid grid-cols-12 gap-8">
  <div className="col-span-7 col-start-2">
    <h1>Hero Title</h1>
  </div>
  <div className="col-span-4 col-start-8 row-start-1">
    <Card>Feature</Card>
  </div>
</section>
// 非対称、重なり、斜めの流れ、グリッド破壊
```

### ✅ Anti-Generic Checklist
- [ ] **Font choice is distinctive** - Inter/Roboto/Arialではない
- [ ] **Color scheme is bold** - 白地に紫グラデーションではない
- [ ] **Layout is unexpected** - 中央揃えヒーロー+3カラムグリッドではない
- [ ] **Design has clear aesthetic direction** - 「安全な」デフォルトではない
- [ ] **Every detail is intentional** - 一般的な選択への収束ではない

### Key Principle
明確な概念的方向性を選択する（brutally minimal、maximalist chaos、retro-futuristic、luxury/refined、brutalist/rawなど）、そして精密に実行する。

**大胆なマキシマリズムも洗練されたミニマリズムも機能する** - 鍵は**意図性**であり、強度ではない。

---

## 2. Accessibility Verification

### Pattern AI ALWAYS skips
AIは実装後に実際のコントラスト比やキーボードナビゲーションをチェックしません。

### The Problem
```typescript
// AI writes this and assumes it's accessible:
<button className="text-gray-400 bg-gray-100">
  Submit
</button>

// Problem: Contrast ratio is only 2.5:1
// (FAILS WCAG AA requirement of 4.5:1)
// AI doesn't actually measure the contrast ratio
```

### Critical Numbers
| 要素 | 最小コントラスト比 |
|------|-----------------|
| Normal text | 4.5:1 |
| Large text (≥18pt/≥14pt bold) | 3:1 |
| UI components | 3:1 |

| 要素 | 最小サイズ |
|------|----------|
| Touch targets | 44x44px |
| Target spacing | 8px |

### Verification Tools
**AI should recommend but doesn't:**
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Chrome DevTools Lighthouse
- Keyboard navigation testing (actual manual test required)

### Correct Implementation
```tsx
// ✅ Proper contrast and touch target
<button className="text-white bg-blue-600 min-h-[44px] min-w-[44px] px-4 py-2">
  Submit
</button>
// Contrast: 8.59:1 (PASSES)
// Touch target: 44x44px minimum
```

---

## 3. Performance Measurement

### Pattern AI ALWAYS skips
AIは実際のパフォーマンス検証手順を提供しません。

### Core Web Vitals Targets
| メトリック | 目標値 | 意味 |
|-----------|-------|------|
| **LCP** | < 2.5s | Largest Contentful Paint（最大コンテンツの描画） |
| **FID** | < 100ms | First Input Delay（初回入力遅延） |
| **CLS** | < 0.1 | Cumulative Layout Shift（累積レイアウトシフト） |

### Image Optimization Checklist
```tsx
// ❌ AI writes: No dimensions (causes CLS)
<img src="/hero.jpg" alt="Hero" />
// Problem: Layout shift when image loads
// CLS score will be high

// ✅ Correct: Dimensions prevent layout shift
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
/>
```

**AI forgets to verify:**
- [ ] Next.js Image component with width/height
- [ ] `priority` for above-the-fold images
- [ ] Appropriate quality (75-90)
- [ ] Responsive srcSet for different screen sizes

---

## 4. Responsive Testing Range

### Pattern AI ALWAYS skips
AIは特定のブレークポイントでのテストを行いません。

### Required Test Range
**375px - 1920px**

### Breakpoints
| Name | Width | Device |
|------|-------|--------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

### Must test at
- **375px** - iPhone SE (smallest common mobile)
- **640px** - sm breakpoint
- **768px** - md breakpoint (tablets)
- **1024px** - lg breakpoint (laptops)
- **1920px** - Full HD desktop

### Common Failures
```tsx
// ❌ AI writes: Breaks on mobile
<div className="flex gap-4">
  <div className="w-64">Sidebar</div>
  <div className="w-full">Content</div>
</div>
// At 375px: Sidebar forces horizontal scroll

// ✅ Correct: Responsive layout
<div className="flex flex-col lg:flex-row gap-4">
  <div className="lg:w-64">Sidebar</div>
  <div className="flex-1">Content</div>
</div>
// At 375px: Vertical stack
// At 1024px+: Horizontal layout
```

---

## 5. Animation Constraints

### Pattern AI ALWAYS skips
AIはGPU最適化されたプロパティのみを使用しません。

### The Rule
**Animate only `transform` and `opacity`**
Never: width, height, top, left, right, bottom, margin, padding

### Why
- `width`/`height` → Layout recalculation (expensive)
- `transform` → GPU-accelerated (cheap)

### Timing Guidelines
| Type | Duration | Use case |
|------|----------|----------|
| **Standard** | 200-300ms | Hover, focus states |
| **Complex motion** | 300-500ms | Modal open/close |
| **Maximum** | 500ms | Any animation |

```tsx
// ❌ AI writes: Causes layout recalculation
<div className="hover:w-64 transition-all duration-300">
  Expand
</div>
// Triggers reflow on every frame

// ✅ Correct: GPU-accelerated
<div className="hover:scale-105 transition-transform duration-300">
  Expand
</div>
// Uses GPU, no layout recalculation
```

### Accessibility: prefers-reduced-motion
```tsx
// ✅ Respect user preferences
<div className="motion-safe:animate-in motion-safe:fade-in motion-reduce:opacity-100">
  Content
</div>
```

---

## 6. Form Accessibility

### Pattern AI ALWAYS skips
AIは適切なARIA属性を省略します。

### The Problem
```tsx
// ❌ AI writes: Missing ARIA
<Input
  className={errors.email ? 'border-red-500' : ''}
  value={email}
  onChange={setEmail}
/>
{errors.email && <p>{errors.email}</p>}
// Problems:
// 1. No aria-invalid
// 2. No aria-describedby
// 3. Error not programmatically associated
```

### ✅ Correct Implementation
```tsx
<Input
  id="email"
  value={email}
  onChange={setEmail}
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
  className={errors.email ? 'border-red-500' : ''}
/>
{errors.email && (
  <p id="email-error" role="alert" className="text-red-600">
    {errors.email}
  </p>
)}
```

### Required ARIA Attributes
| Attribute | When to use |
|-----------|-------------|
| `aria-invalid` | When field has validation error |
| `aria-describedby` | When field has error or help text |
| `aria-required` | When field is required |
| `aria-label` | When no visible label exists |
| `role="alert"` | For error messages |

---

## 7. Semantic HTML

### Pattern AI ALWAYS skips
AIは適切な要素の代わりにdivを使用します。

### The Problem: Div Soup
```tsx
// ❌ AI writes: Div soup
<div className="header">
  <div className="logo">Brand</div>
  <div className="nav">
    <div className="nav-item">Home</div>
    <div className="nav-item">About</div>
  </div>
</div>
<div className="main">
  <div className="article">
    <div className="title">Article Title</div>
    <div className="content">Content...</div>
  </div>
</div>
<div className="footer">
  Copyright 2025
</div>
```

### ✅ Correct: Semantic Structure
```tsx
<header>
  <h1>Brand</h1>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h2>Article Title</h2>
    <p>Content...</p>
  </article>
</main>
<footer>
  <p>Copyright 2025</p>
</footer>
```

### Required Elements
| Element | Purpose |
|---------|---------|
| `<header>` | Page/section headers |
| `<nav>` | Navigation |
| `<main>` | Primary content (once per page) |
| `<article>` | Self-contained content |
| `<section>` | Thematic grouping |
| `<aside>` | Tangentially related content |
| `<footer>` | Page/section footers |

---

## 8. Feedback Timing

### Pattern AI ALWAYS skips
AIはフィードバックが0.4秒未満であることを保証しません。

### Doherty Threshold
システムは**0.4秒以内**に応答する必要があります。

### The Problem
```tsx
// ❌ AI writes: No loading state
<Button onClick={handleSubmit}>
  Submit
</Button>
// User doesn't know if click registered
// No feedback during async operation
```

### ✅ Correct: Immediate Feedback
```tsx
<Button
  onClick={handleSubmit}
  disabled={isLoading}
>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      処理中...
    </>
  ) : (
    "Submit"
  )}
</Button>
```

### Button States Required
- **Hover** - Visual feedback on mouse over
- **Active** - Visual feedback on click
- **Focus** - Keyboard focus indicator
- **Loading** - During async operations
- **Disabled** - When action unavailable

---

## Summary: AI's Systematic Failures

AIは以下を自信を持って実装しますが、検証を怠ります：

1. **Generic aesthetics** - Inter/Roboto、紫グラデーション
2. **Low contrast** - 見た目は良いが測定していない
3. **Desktop-only** - モバイルブレークポイントでテストしていない
4. **Missing ARIA** - フォームがあるがアクセシビリティ属性がない
5. **Layout shift** - 画像があるがdimensionsがない
6. **Wrong animation** - transform の代わりに width/height
7. **Small touch targets** - 44x44px未満のボタン
8. **No feedback** - ローディング状態がない

**When in doubt: "Did I actually test this with tools, or am I assuming?"**
