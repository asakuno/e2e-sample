/**
 * NavItem コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

vi.mock('@inertiajs/react', () => ({
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}));

import { NavItem } from '../NavItem';

describe('NavItem', () => {
  const defaultProps = {
    href: '/dashboard',
    icon: 'dashboard',
    label: 'ダッシュボード',
  };

  it('ラベルが表示されること', () => {
    render(<NavItem {...defaultProps} />);
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
  });

  it('アイコンが表示されること', () => {
    render(<NavItem {...defaultProps} />);
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('active=true で aria-current="page" が設定されること', () => {
    render(<NavItem {...defaultProps} active={true} />);
    expect(screen.getByRole('link')).toHaveAttribute('aria-current', 'page');
  });

  it('active=false で aria-current が設定されないこと', () => {
    render(<NavItem {...defaultProps} active={false} />);
    expect(screen.getByRole('link')).not.toHaveAttribute('aria-current');
  });

  it('リンクの href が正しいこと', () => {
    render(<NavItem {...defaultProps} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard');
  });
});
