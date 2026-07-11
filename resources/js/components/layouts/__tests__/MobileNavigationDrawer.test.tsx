import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { MobileNavigationDrawer } from '../MobileNavigationDrawer';

describe('MobileNavigationDrawer', () => {
  it('open=false の場合、メインメニューがアクセシビリティツリーから隠れること', () => {
    // Arrange & Act
    render(
      <MobileNavigationDrawer open={false} onOpenChange={vi.fn()}>
        <a href="/dashboard">Dashboard</a>
      </MobileNavigationDrawer>,
    );

    // Assert
    expect(screen.queryByRole('dialog', { name: 'メインメニュー' })).not.toBeInTheDocument();
  });

  it('open=true の場合、閉じるボタンへフォーカスが移ること', () => {
    // Arrange & Act
    render(
      <MobileNavigationDrawer open={true} onOpenChange={vi.fn()}>
        <a href="/dashboard">Dashboard</a>
      </MobileNavigationDrawer>,
    );
    const expected = screen.getByRole('button', { name: 'メニューを閉じる' });

    // Act
    const actual = document.activeElement;

    // Assert
    expect(actual).toBe(expected);
  });

  it('Escape キーを押した場合、ドロワーを閉じる要求を通知すること', async () => {
    // Arrange
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MobileNavigationDrawer open={true} onOpenChange={onOpenChange}>
        <a href="/dashboard">Dashboard</a>
      </MobileNavigationDrawer>,
    );
    const expected = false;

    // Act
    await user.keyboard('{Escape}');
    const actual = onOpenChange.mock.calls[0]?.[0];

    // Assert
    expect(actual).toBe(expected);
  });

  it('背景をクリックした場合、ドロワーを閉じる要求を通知すること', async () => {
    // Arrange
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MobileNavigationDrawer open={true} onOpenChange={onOpenChange}>
        <a href="/dashboard">Dashboard</a>
      </MobileNavigationDrawer>,
    );
    const backdrop = screen.getByRole('button', { name: 'ナビゲーションの背景を閉じる' });
    const expected = false;

    // Act
    await user.click(backdrop);
    const actual = onOpenChange.mock.calls[0]?.[0];

    // Assert
    expect(actual).toBe(expected);
  });

  it('デスクトップ幅へ切り替わった場合、ドロワーを閉じる要求を通知すること', () => {
    // Arrange
    const onOpenChange = vi.fn();
    const addEventListener = vi.fn();
    const mediaQueryList = {
      matches: false,
      media: '(min-width: 64rem)',
      onchange: null,
      addEventListener,
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => mediaQueryList),
    });

    try {
      render(
        <MobileNavigationDrawer open={true} onOpenChange={onOpenChange}>
          <a href="/dashboard">Dashboard</a>
        </MobileNavigationDrawer>,
      );

      // Act
      const handleChange = addEventListener.mock.calls[0]?.[1] as
        | ((event: MediaQueryListEvent) => void)
        | undefined;
      handleChange?.({ matches: true } as MediaQueryListEvent);

      // Assert
      expect(onOpenChange).toHaveBeenCalledWith(false);
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    }
  });

  it('最後の操作要素から Tab 移動した場合、最初の操作要素へフォーカスが戻ること', async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <MobileNavigationDrawer open={true} onOpenChange={vi.fn()}>
        <a href="/dashboard">Dashboard</a>
      </MobileNavigationDrawer>,
    );
    const expected = screen.getByRole('link', { name: 'Dashboard' });

    // Act
    await user.tab();
    const actual = document.activeElement;

    // Assert
    expect(actual).toBe(expected);
  });
});
