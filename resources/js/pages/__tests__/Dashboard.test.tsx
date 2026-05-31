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

import type { ActivityItemData, StatCardData, TrendData } from '@/types/dashboard';
import Dashboard from '../Dashboard';

const stats: StatCardData[] = [
  {
    label: 'S&P 500',
    value: '5,842.91',
    change: '+24.3',
    changeDirection: 'up',
    icon: 'show_chart',
    iconColorClass: 'text-blue-500',
  },
  {
    label: '日経平均',
    value: '39,812.24',
    change: '-0.18%',
    changeDirection: 'down',
    icon: 'candlestick_chart',
    iconColorClass: 'text-red-500',
  },
  {
    label: 'ウォッチリスト',
    value: '12',
    change: '+2銘柄',
    changeDirection: 'up',
    icon: 'visibility',
    iconColorClass: 'text-green-500',
  },
];

const recentTrend: TrendData = {
  total: 1500,
  changePercent: '+8.2%',
  changeDirection: 'up',
  description: '先月比',
  points: [
    { label: '1月', value: 100 },
    { label: '2月', value: 150 },
  ],
};

const recentActivities: ActivityItemData[] = [
  {
    id: 1,
    title: 'AAPL が高値を更新',
    description: 'ウォッチ銘柄の Apple が直近30日の高値を更新しました',
    timeAgo: '10分前',
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
  recentActivities,
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

  it('StatCard が3枚表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('日経平均')).toBeInTheDocument();
    expect(screen.getByText('ウォッチリスト')).toBeInTheDocument();
  });

  it('TrendChart が表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('1500')).toBeInTheDocument();
  });

  it('RecentActivity が表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('最近のアクティビティ')).toBeInTheDocument();
    expect(screen.getByText('AAPL が高値を更新')).toBeInTheDocument();
  });

  it('main 要素が存在すること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
