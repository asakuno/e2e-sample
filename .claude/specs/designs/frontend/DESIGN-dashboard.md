# DESIGN: ダッシュボード画面

## 概要

ログイン後に遷移するダッシュボード画面。AuthenticatedLayout（サイドナビ + トップナビ）と、統計カード・チャート・アクティビティリストで構成。

## モック分析

モック画面（`memos/screens/dashboard/screen.png`）より:

- **サイドナビ（左固定 w-60）**: Web Appロゴ、ナビ項目4つ（ホーム/ダッシュボード/レポート/設定）、下部にヘルプ&サポート
- **トップナビ**: 検索バー、通知ベル（赤ドット付き）、ユーザーアバター+名前+役職、ログアウトアイコン
- **ウェルカムバナー**: 「こんにちは、{lastName}さん」+サブテキスト、日付ボタン、新規作成ボタン
- **統計カード3枚（横並び）**: アクティビティ(85%, +2.4%)、未完了タスク(12件, 期限切れ2件)、通知(3件)
- **最近の推移チャート（2/3幅）**: 折れ線グラフ、数値1,240 +15%、週/月切替タブ
- **最近のアクティビティ（1/3幅）**: カラードット付きリスト4件、「履歴を表示」リンク

## カラーパレット

モックから抽出:
- プライマリブルー: `#2767cf`（既存PrimaryButtonと同色）
- サイドナビアクティブ背景: `bg-blue-50`、テキスト: `text-blue-600`
- 統計カード: 白背景、角丸、軽いシャドウ
- 増加: `text-green-600`、減少/警告: `text-red-500`
- アクティビティドット: 青/緑/オレンジ/グレー

## アーキテクチャ

### データフロー

全データは **Inertia Props** で渡す（静的ページデータ）。

```
Laravel Controller (DashboardPageController)
  → Inertia::render('Dashboard', [
      // auth, app, flash は HandleInertiaRequests で共有済み
      'stats' => [...],
      'recentTrend' => [...],
      'recentActivities' => [...],
    ])
```

### 型定義

```typescript
// resources/js/types/dashboard.ts

/** 統計カード */
interface StatCardData {
  label: string;
  value: string;
  subLabel?: string;
  subValue?: string;
  /** 変化率（例: "+2.4%"） */
  change?: string;
  /** 変化方向 */
  changeDirection?: 'up' | 'down' | 'neutral';
  /** Material Symbols アイコン名 */
  icon: string;
  /** アイコン背景色のTailwindクラス */
  iconColorClass: string;
}

/** チャートデータポイント */
interface TrendDataPoint {
  label: string; // 曜日ラベル（月/火/水...）
  value: number;
}

/** チャートデータ */
interface TrendData {
  total: number;
  changePercent: string;
  changeDirection: 'up' | 'down' | 'neutral';
  description: string;
  points: TrendDataPoint[];
}

/** アクティビティアイテム */
interface ActivityItemData {
  id: number;
  title: string;
  description: string;
  timeAgo: string;
  /** ドットの色 */
  dotColor: 'blue' | 'green' | 'orange' | 'gray';
}

/** ダッシュボードページProps */
interface DashboardPageProps extends AppPageProps {
  stats: StatCardData[];
  recentTrend: TrendData;
  recentActivities: ActivityItemData[];
}
```

## コンポーネント構成

```
AuthenticatedLayout
├── SideNav（左固定サイドバー）
│   ├── ロゴ
│   ├── NavItem（4つ）
│   └── ヘルプ&サポート
├── TopNav（上部バー）
│   ├── 検索バー
│   ├── 通知ベル
│   ├── ユーザー情報
│   └── ログアウトボタン
└── メインコンテンツ（children）

Dashboard（ページコンポーネント）
├── WelcomeBanner
├── StatCard x3（グリッド）
├── TrendChart（2/3幅）
└── RecentActivity（1/3幅）
```

### ファイル配置

```
resources/js/
├── layouts/
│   └── AuthenticatedLayout.tsx
├── components/
│   ├── layouts/
│   │   ├── SideNav.tsx
│   │   ├── TopNav.tsx
│   │   ├── NavItem.tsx
│   │   └── __tests__/
│   │       ├── SideNav.test.tsx
│   │       ├── TopNav.test.tsx
│   │       └── NavItem.test.tsx
│   └── features/
│       └── dashboard/
│           ├── WelcomeBanner.tsx
│           ├── StatCard.tsx
│           ├── TrendChart.tsx
│           ├── RecentActivity.tsx
│           ├── ActivityItem.tsx
│           └── __tests__/
│               ├── WelcomeBanner.test.tsx
│               ├── StatCard.test.tsx
│               ├── TrendChart.test.tsx
│               ├── RecentActivity.test.tsx
│               └── ActivityItem.test.tsx
├── pages/
│   └── Dashboard.tsx
├── types/
│   └── dashboard.ts
```

## レスポンシブ設計

| ブレークポイント | サイドナビ | コンテンツ |
|----------------|-----------|-----------|
| < 768px | ハンバーガーメニュー（非表示） | 1カラム、統計カード縦並び |
| 768px-1024px | 折りたたみ（アイコンのみ） | 2カラム |
| >= 1024px | フル表示（w-60） | モック通りのレイアウト |

## ダークモード

- サイドナビ: `dark:bg-gray-900 dark:border-gray-700`
- カード: `dark:bg-gray-800`
- テキスト: `dark:text-gray-100 / dark:text-gray-400`

## アクセシビリティ

- セマンティックHTML: `<nav>`, `<main>`, `<aside>`, `<header>`
- ナビにaria-label、アクティブ項目に`aria-current="page"`
- 通知バッジにaria-label（「3件の未読通知」）
- キーボードナビゲーション対応
- カラーコントラスト4.5:1以上

---

## 実装計画

### Phase 2: AuthenticatedLayout

#### Phase 2-1: NavItem コンポーネント

**RED**
- `resources/js/components/layouts/__tests__/NavItem.test.tsx` 作成
  - ラベルとアイコンが表示されること
  - アクティブ状態で`aria-current="page"`が設定されること
  - アクティブ時にハイライトスタイルが適用されること
  - リンクのhrefが正しいこと

**GREEN**
- `resources/js/components/layouts/NavItem.tsx` 実装
  - Props: `{ label: string; icon: string; href: string; active?: boolean }`
  - Inertia `<Link>` 使用
  - Material Symbols Outlined アイコン
  - アクティブ: `bg-blue-50 text-blue-600`、非アクティブ: `text-gray-600 hover:bg-gray-50`

**REFACTOR**
- スタイル調整、ダークモード対応

#### Phase 2-2: SideNav コンポーネント

**RED**
- `resources/js/components/layouts/__tests__/SideNav.test.tsx` 作成
  - ロゴが表示されること
  - 4つのナビ項目が表示されること
  - ヘルプ&サポートリンクが表示されること
  - nav要素にaria-labelが設定されること

**GREEN**
- `resources/js/components/layouts/SideNav.tsx` 実装
  - Props: `{ currentPath: string }`
  - NavItem を使用してナビ項目を描画
  - ナビ項目: ホーム(`/`)、ダッシュボード(`/dashboard`)、レポート(`/reports`)、設定(`/settings`)
  - 下部にヘルプ&サポート

**REFACTOR**
- レスポンシブ: モバイルで非表示、ハンバーガーメニュートグル

#### Phase 2-3: TopNav コンポーネント

**RED**
- `resources/js/components/layouts/__tests__/TopNav.test.tsx` 作成
  - 検索バーが表示されること
  - ユーザー名が表示されること
  - ログアウトボタンが表示されること
  - 通知バッジのaria-labelが正しいこと

**GREEN**
- `resources/js/components/layouts/TopNav.tsx` 実装
  - Props: `{ user: App.Models.User; notificationCount?: number }`
  - 検索バー（見た目のみ、機能は後続タスク）
  - 通知ベル + 赤ドットバッジ
  - ユーザーアバター + 名前 + 役職
  - ログアウトボタン（Inertia `router.post('/logout')`）

**REFACTOR**
- レスポンシブ: モバイルで検索バー非表示、ハンバーガーアイコン追加

#### Phase 2-4: AuthenticatedLayout 統合

**RED**
- `resources/js/layouts/__tests__/AuthenticatedLayout.test.tsx` 作成
  - SideNav、TopNav、childrenが描画されること
  - main要素が存在すること

**GREEN**
- `resources/js/layouts/AuthenticatedLayout.tsx` 実装
  - Props: `{ children: React.ReactNode }`
  - `usePage()` から auth, app 情報取得
  - SideNav + TopNav + メインコンテンツ領域

**REFACTOR**
- レスポンシブ統合テスト、ダークモード確認

---

### Phase 3: ダッシュボードUIコンポーネント

#### Phase 3-1: 型定義

- `resources/js/types/dashboard.ts` 作成
  - `StatCardData`, `TrendDataPoint`, `TrendData`, `ActivityItemData`, `DashboardPageProps`

#### Phase 3-2: StatCard コンポーネント

**RED**
- `resources/js/components/features/dashboard/__tests__/StatCard.test.tsx` 作成
  - ラベルと値が表示されること
  - 変化率が表示されること（up: 緑、down: 赤）
  - サブラベル/サブ値が表示されること
  - アイコンが表示されること

**GREEN**
- `resources/js/components/features/dashboard/StatCard.tsx` 実装
  - Props: `StatCardData`
  - 白カード、角丸、軽いシャドウ
  - 右上にアイコン（カラー背景丸）
  - 変化率の方向に応じた矢印・色

**REFACTOR**
- ダークモード、レスポンシブ

#### Phase 3-3: WelcomeBanner コンポーネント

**RED**
- テスト: ユーザー名表示、サブテキスト表示、日付ボタン・新規作成ボタン表示

**GREEN**
- `resources/js/components/features/dashboard/WelcomeBanner.tsx` 実装
  - Props: `{ userName: string }`
  - 「こんにちは、{userName}さん」+ サブテキスト
  - 日付ボタン（見た目のみ）、新規作成ボタン

**REFACTOR**
- レスポンシブ: モバイルでボタン縦並び

#### Phase 3-4: ActivityItem コンポーネント

**RED**
- テスト: タイトル・説明・時間表示、ドットカラー

**GREEN**
- `resources/js/components/features/dashboard/ActivityItem.tsx` 実装
  - Props: `ActivityItemData`
  - カラードット + タイトル + 説明 + 時間

**REFACTOR**
- ダークモード

#### Phase 3-5: RecentActivity コンポーネント

**RED**
- テスト: タイトル「最近のアクティビティ」表示、アイテムリスト表示、「履歴を表示」リンク

**GREEN**
- `resources/js/components/features/dashboard/RecentActivity.tsx` 実装
  - Props: `{ activities: ActivityItemData[] }`
  - ActivityItem を使用してリスト描画

**REFACTOR**
- ダークモード

#### Phase 3-6: TrendChart コンポーネント

**RED**
- テスト: タイトル・合計値・変化率表示、週/月切替タブ表示

**GREEN**
- `resources/js/components/features/dashboard/TrendChart.tsx` 実装
  - Props: `TrendData`
  - ヘッダー: タイトル + 週/月切替
  - 数値表示: 合計 + 変化率
  - チャートエリア: SVGによるシンプルな折れ線グラフ（ライブラリ不使用）

**REFACTOR**
- レスポンシブ、ダークモード

---

### Phase 4: ダッシュボードページ統合

#### Phase 4-1: Dashboard ページコンポーネント

**RED**
- `resources/js/pages/__tests__/Dashboard.test.tsx` 作成
  - AuthenticatedLayout内にレンダリングされること
  - WelcomeBanner表示
  - StatCard 3枚表示
  - TrendChart表示
  - RecentActivity表示
  - Head titleが「ダッシュボード」であること

**GREEN**
- `resources/js/pages/Dashboard.tsx` 実装
  - `DashboardPageProps` 使用
  - AuthenticatedLayout でラップ
  - グリッドレイアウト:
    - ウェルカムバナー（全幅）
    - 統計カード3枚（`grid-cols-1 md:grid-cols-3`）
    - チャート(2/3) + アクティビティ(1/3)（`grid-cols-1 lg:grid-cols-3`）

**REFACTOR**
- レスポンシブ最終調整
- ダークモード最終確認
- アクセシビリティ最終確認

---

## バックエンド（別タスク・参考）

ダッシュボードのバックエンド実装は別途計画する。フロントエンド開発中はモックデータを使用。

```php
// app/Http/Controllers/Web/DashboardPageController.php
class DashboardPageController extends Controller
{
    public function __invoke(): \Inertia\Response
    {
        return Inertia::render('Dashboard', [
            'stats' => [...],
            'recentTrend' => [...],
            'recentActivities' => [...],
        ]);
    }
}
```

```php
// routes/web.php
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', DashboardPageController::class)->name('dashboard');
});
```
