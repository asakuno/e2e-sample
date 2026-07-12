/**
 * Dashboard ページテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  router: { post: vi.fn() },
  usePage: vi.fn(() => ({
    url: '/dashboard',
    props: {
      auth: { user: { id: 1, name: 'テストユーザー' } },
    },
  })),
}));

import type {
  ActivityItemData,
  DashboardStatData,
  TopStockData,
  TrendData,
} from '@/types/dashboard';
import Dashboard from '../Dashboard';

const stats: DashboardStatData[] = [
  {
    kind: 'watchlist',
    value: 3,
  },
  {
    kind: 'positiveAnalysis',
    value: 2,
  },
  {
    kind: 'negativeAnalysis',
    value: 1,
  },
  {
    kind: 'unanalyzedNews',
    value: 1,
  },
  {
    kind: 'latestAnalysis',
    value: '2026-06-15 11:00',
  },
];

const statsWithoutPriorityItems: DashboardStatData[] = [
  { kind: 'watchlist', value: 0 },
  { kind: 'positiveAnalysis', value: 0 },
  { kind: 'negativeAnalysis', value: 0 },
  { kind: 'unanalyzedNews', value: 0 },
  { kind: 'latestAnalysis', value: null },
];

const recentTrend: TrendData = {
  total: 4,
  changePercent: '+2件',
  changeDirection: 'up',
  description: '直近7日の分析件数',
  points: [
    { label: '6/9', value: 1 },
    { label: '6/10', value: 3 },
  ],
};

const topStocks: TopStockData[] = [
  {
    id: 1,
    symbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'us',
    totalScore: 8.25,
    latestPrice: 182.5,
    changePercent: 2.35,
    sentiment: 1,
    sentimentLabel: 'ポジティブ',
    positiveCount: 3,
    negativeCount: 1,
    reason: 'ポジティブ材料が増加',
    signalDate: '2026-06-15',
    updatedAt: '2026-06-15 12:00',
  },
];

const attentionStocks: TopStockData[] = [
  {
    id: 2,
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    market: 'us',
    totalScore: -9,
    latestPrice: 320.25,
    changePercent: -4.2,
    sentiment: -1,
    sentimentLabel: 'ネガティブ',
    positiveCount: 1,
    negativeCount: 5,
    reason: '強いネガティブシグナルを検出',
    signalDate: '2026-06-15',
    updatedAt: '2026-06-15 12:30',
  },
];

const importantNews: ActivityItemData[] = [
  {
    id: 1,
    articleId: 1,
    title: 'Apple announces new product',
    description: 'AAPL / impact 8: 売上成長にポジティブ',
    timeAgo: '30分前',
    dotColor: 'green',
    source: 'Reuters',
    publishedAt: '2026-06-15 10:00',
  },
];

const defaultProps = {
  app: { name: 'Web App', env: 'testing', locale: 'ja' },
  auth: { user: { id: 1, name: 'テストユーザー', email: 'test@example.com' } },
  flash: {},
  errors: {},
  stats,
  recentTrend,
  topStocks,
  attentionStocks,
  importantNews,
  latestAnalysisAt: '2026-06-15 11:00',
};

describe('Dashboard', () => {
  it('Head title が「ダッシュボード」であること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(document.querySelector('title')).toHaveTextContent('ダッシュボード');
  });

  it('ページ見出しと主要セクションが表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'マーケットダッシュボード' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '現在の確認候補' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '状況サマリー' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '分析推移' })).toBeInTheDocument();
  });

  it('確認候補に3種類の項目と利用可能な導線が表示されること', () => {
    render(<Dashboard {...defaultProps} />);

    expect(screen.getByText('ポジティブ材料')).toBeInTheDocument();
    expect(screen.getByText('注目シグナル')).toBeInTheDocument();
    expect(screen.getByText('分析待ち')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Apple announces new product/ })).toHaveAttribute(
      'href',
      '/news?article_id=1',
    );
    expect(screen.getByText('Reuters · 2026-06-15 10:00 · 30分前')).toBeVisible();
    expect(screen.getByRole('link', { name: /TSLA Tesla Inc\./ })).toHaveAttribute(
      'href',
      '/stocks/2',
    );
    expect(screen.getByText('1件のニュースが分析待ちです')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /1件のニュースが分析待ちです/ })).toHaveAttribute(
      'href',
      '/news?analysis_status=unanalyzed',
    );
    expect(screen.getByRole('link', { name: 'ニュース一覧' })).toHaveAttribute('href', '/news');
    expect(screen.getByRole('link', { name: '銘柄一覧' })).toHaveAttribute('href', '/stocks');
  });

  it('状況サマリーに4種類の集計を表示し、最新分析日時を重複表示しないこと', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('ウォッチリスト銘柄数')).toBeInTheDocument();
    expect(screen.getByText('直近ポジティブ材料')).toBeInTheDocument();
    expect(screen.getByText('直近ネガティブ材料')).toBeInTheDocument();
    expect(screen.getByText('未分析ニュース')).toBeInTheDocument();
    expect(document.body.textContent?.match(/最新分析日時/g) ?? []).toHaveLength(1);
    expect(screen.getByText('2026-06-15 11:00')).toBeInTheDocument();
  });

  it('TrendChart が表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('直近7日の分析件数')).toBeInTheDocument();
  });

  it('注目銘柄ランキングが表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('注目銘柄ランキング')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('182.50')).toBeVisible();
    expect(screen.getByText('+2.35%')).toBeVisible();
    expect(screen.getByRole('link', { name: /1位 AAPL Apple Inc\./ })).toHaveAttribute(
      'href',
      '/stocks/1',
    );
  });

  it('確認候補がない場合に空状態と銘柄探索導線を表示すること', () => {
    render(
      <Dashboard
        {...defaultProps}
        stats={statsWithoutPriorityItems}
        importantNews={[]}
        topStocks={[]}
        attentionStocks={[]}
        latestAnalysisAt={null}
      />,
    );

    expect(screen.getByText('現時点で確認する項目はありません')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '銘柄を探す' })).toHaveAttribute('href', '/stocks');
    expect(screen.queryByRole('link', { name: 'ニュース一覧' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '銘柄一覧' })).not.toBeInTheDocument();
  });

  it('モバイルのDOM順が確認候補、サマリー、ランキング、分析推移の順であること', () => {
    render(<Dashboard {...defaultProps} />);
    const sections = [
      screen.getByRole('heading', { name: '現在の確認候補' }),
      screen.getByRole('heading', { name: '状況サマリー' }),
      screen.getByRole('heading', { name: '注目銘柄ランキング' }),
      screen.getByRole('heading', { name: '分析推移' }),
    ];

    for (const [index, section] of sections.entries()) {
      const nextSection = sections[index + 1];
      if (nextSection !== undefined) {
        expect(
          section.compareDocumentPosition(nextSection) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      }
    }
  });

  it('main 要素が存在すること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
