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
    label: '総ユーザー数',
    value: '1,234',
    change: '+12%',
    changeDirection: 'up',
    icon: 'group',
    iconColorClass: 'text-blue-500',
  },
  {
    label: 'アクティブ',
    value: '567',
    change: '+5%',
    changeDirection: 'up',
    icon: 'trending_up',
    iconColorClass: 'text-green-500',
  },
  {
    label: '新規登録',
    value: '89',
    change: '-2%',
    changeDirection: 'down',
    icon: 'person_add',
    iconColorClass: 'text-purple-500',
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
  { id: 1, title: 'タスク完了', description: 'タスクAを完了', timeAgo: '1分前', dotColor: 'green' },
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
    expect(screen.getByText(/おかえりなさい/)).toBeInTheDocument();
  });

  it('StatCard が3枚表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('総ユーザー数')).toBeInTheDocument();
    expect(screen.getByText('アクティブ')).toBeInTheDocument();
    expect(screen.getByText('新規登録')).toBeInTheDocument();
  });

  it('TrendChart が表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('1500')).toBeInTheDocument();
  });

  it('RecentActivity が表示されること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('最近のアクティビティ')).toBeInTheDocument();
    expect(screen.getByText('タスク完了')).toBeInTheDocument();
  });

  it('main 要素が存在すること', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
