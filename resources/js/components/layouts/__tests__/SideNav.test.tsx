/**
 * SideNav コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

vi.mock('@inertiajs/react', () => ({
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  usePage: vi.fn(() => ({
    url: '/dashboard',
  })),
}));

import { SideNav } from '../SideNav';

describe('SideNav', () => {
  it('ロゴ「Stock Insight」が表示されること', () => {
    render(<SideNav />);
    expect(screen.getByText('Stock Insight')).toBeInTheDocument();
  });

  it('4つのナビゲーション項目が表示されること', () => {
    render(<SideNav />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Stocks')).toBeInTheDocument();
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
    expect(screen.getByText('News')).toBeInTheDocument();
  });

  it('投資助言ではない旨の注意表示が表示されること', () => {
    render(<SideNav />);
    expect(screen.getByText(/投資助言ではありません/)).toBeInTheDocument();
  });

  it('nav 要素に aria-label が設定されること', () => {
    render(<SideNav />);
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label');
  });
});
