/**
 * NavItem コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';

vi.mock('@inertiajs/react', () => ({
  router: { visit: vi.fn() },
}));

import { NavItem } from '../NavItem';

describe('NavItem', () => {
  const defaultProps = {
    href: '/dashboard',
    icon: 'dashboard',
    label: 'ダッシュボード',
  } as const;

  it('ラベルが表示されること', () => {
    // Arrange & Act
    render(<NavItem {...defaultProps} />);
    const actual = screen.getByRole('link', { name: 'ダッシュボード' });

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('active=true で aria-current="page" が設定されること', () => {
    // Arrange & Act
    render(<NavItem {...defaultProps} active={true} />);
    const actual = screen.getByRole('link');

    // Assert
    expect(actual).toHaveAttribute('aria-current', 'page');
  });

  it('active=false で aria-current が設定されないこと', () => {
    // Arrange & Act
    render(<NavItem {...defaultProps} active={false} />);
    const actual = screen.getByRole('link');

    // Assert
    expect(actual).not.toHaveAttribute('aria-current');
  });

  it('リンクの href が正しいこと', () => {
    // Arrange & Act
    render(<NavItem {...defaultProps} />);
    const actual = screen.getByRole('link');
    const expected = '/dashboard';

    // Assert
    expect(actual).toHaveAttribute('href', expected);
  });

  it('リンクを選択した場合、onNavigate が呼ばれること', async () => {
    // Arrange
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<NavItem {...defaultProps} onNavigate={onNavigate} />);

    // Act
    await user.click(screen.getByRole('link', { name: 'ダッシュボード' }));

    // Assert
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
