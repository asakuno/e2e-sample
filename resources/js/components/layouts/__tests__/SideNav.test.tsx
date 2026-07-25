/**
 * SideNav コンポーネントテスト
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';

vi.mock('@inertiajs/react', () => ({
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  router: { visit: vi.fn() },
  usePage: vi.fn(() => ({
    url: '/dashboard',
  })),
}));

import { SideNav, SideNavView } from '../SideNav';

describe('SideNav', () => {
  it('ホームへのロゴリンクが表示されること', () => {
    // Arrange & Act
    render(<SideNav />);
    const actual = screen.getByRole('link', { name: 'Stock Insight ホーム' });

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('4つのナビゲーション項目が表示されること', () => {
    // Arrange
    const expected = ['Dashboard', 'Stocks', 'Watchlist', 'News'];

    // Act
    render(<SideNav />);
    const navigation = screen.getByRole('navigation', { name: 'メインナビゲーション' });
    const actual = expected.filter((label) =>
      within(navigation).queryByRole('link', { name: label }),
    );

    // Assert
    expect(actual).toEqual(expected);
  });

  it('投資助言ではない旨の注意表示が表示されること', () => {
    // Arrange & Act
    render(<SideNav />);
    const actual = screen.getByText(/投資助言ではありません/);

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('nav 要素にアクセシブルな名前が設定されること', () => {
    // Arrange & Act
    render(<SideNav />);
    const actual = screen.getByRole('navigation');
    const expected = 'メインナビゲーション';

    // Assert
    expect(actual).toHaveAttribute('aria-label', expected);
  });

  it('画面高に収まらない場合、ナビゲーション自体を縦スクロールできること', () => {
    // Arrange & Act
    render(<SideNav />);
    const actual = screen.getByRole('navigation', { name: 'メインナビゲーション' });

    // Assert
    expect(actual).toHaveClass('overflow-y-auto', 'overscroll-contain');
  });

  it('詳細画面では親となる Stocks 項目が現在位置として示されること', () => {
    // Arrange & Act
    render(<SideNavView currentUrl="/stocks/AAPL?range=1m" />);
    const actual = screen.getByRole('link', { name: 'Stocks' });

    // Assert
    expect(actual).toHaveAttribute('aria-current', 'page');
  });

  it('ナビゲーション項目を選択した場合、onNavigate が呼ばれること', async () => {
    // Arrange
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<SideNavView currentUrl="/dashboard" onNavigate={onNavigate} />);

    // Act
    await user.click(screen.getByRole('link', { name: 'News' }));

    // Assert
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
