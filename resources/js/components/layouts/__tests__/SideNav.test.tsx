/**
 * SideNav コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
  it('ロゴ「Web App」が表示されること', () => {
    render(<SideNav />);
    expect(screen.getByText('Web App')).toBeInTheDocument();
  });

  it('4つのナビゲーション項目が表示されること', () => {
    render(<SideNav />);
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    expect(screen.getByText('プロジェクト')).toBeInTheDocument();
    expect(screen.getByText('メンバー')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
  });

  it('ヘルプ＆サポートリンクが表示されること', () => {
    render(<SideNav />);
    expect(screen.getByText('ヘルプ＆サポート')).toBeInTheDocument();
  });

  it('nav 要素に aria-label が設定されること', () => {
    render(<SideNav />);
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label');
  });
});
