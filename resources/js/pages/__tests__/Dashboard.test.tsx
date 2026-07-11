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
    kind: 'unanalyzedNews',
    value: 1,
  },
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
    positiveCount: 3,
    negativeCount: 1,
    reason: 'ポジティブ材料が増加',
    signalDate: '2026-06-15',
  },
];

const importantNews: ActivityItemData[] = [
  {
    id: 1,
    title: 'Apple announces new product',
    description: 'AAPL / impact 8: 売上成長にポジティブ',
    timeAgo: '2026-06-15 11:00',
    dotColor: 'green',
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
  importantNews,
  latestAnalysisAt: '2026-06-15 11:00',
};

describe('Dashboard', () => {
  it('Head title が「ダッシュボード」であること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(document.querySelector('title')).toHaveTextContent('ダッシュボード');
  });

  it('WelcomeBanner が表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('マーケットダッシュボード')).toBeInTheDocument();
  });

  it('実データ集計の StatCard が表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('ウォッチリスト銘柄数')).toBeInTheDocument();
    expect(screen.getByText('直近ポジティブ材料')).toBeInTheDocument();
    expect(screen.getByText('未分析ニュース')).toBeInTheDocument();
  });

  it('TrendChart が表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('直近7日の分析件数')).toBeInTheDocument();
  });

  it('注目銘柄ランキングと重要ニュースが表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('注目銘柄ランキング')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('重要ニュース')).toBeInTheDocument();
    expect(screen.getByText('Apple announces new product')).toBeInTheDocument();
  });

  it('main 要素が存在すること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
