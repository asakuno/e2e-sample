/**
 * LogoutModal コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { LogoutModal } from '../LogoutModal';

describe('LogoutModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    action: vi.fn(),
    processing: false,
  };

  it('open=true でモーダルが表示されること', () => {
    // Arrange
    const expected = {
      title: 'ログアウトしますか？',
      description: '現在のセッションを終了し、ログイン画面へ戻ります。',
    };

    // Act
    render(<LogoutModal {...defaultProps} />);
    const actual = {
      title: screen.getByRole('heading').textContent,
      description: screen.getByText(expected.description).textContent,
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('open=false でモーダルが非表示であること', () => {
    // Arrange & Act
    render(<LogoutModal {...defaultProps} open={false} />);
    const actual = screen.queryByRole('dialog');

    // Assert
    expect(actual).not.toBeInTheDocument();
  });

  it('ログアウトボタンクリックで action が呼ばれること', async () => {
    // Arrange
    const user = userEvent.setup();
    const action = vi.fn();
    render(<LogoutModal {...defaultProps} action={action} />);

    // Act
    await user.click(screen.getByRole('button', { name: 'ログアウト' }));

    // Assert
    expect(action).toHaveBeenCalledOnce();
  });

  it('キャンセルクリックで onClose が呼ばれること', async () => {
    // Arrange
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<LogoutModal {...defaultProps} onClose={onClose} />);

    // Act
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    // Assert
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('processing=true でログアウトボタンが無効化されること', () => {
    // Arrange
    const expected = {
      busy: 'true',
      disabled: true,
    };

    // Act
    render(<LogoutModal {...defaultProps} processing={true} />);
    const button = screen.getByRole('button', { name: 'ログアウト中...' });
    const actual = {
      busy: button.getAttribute('aria-busy'),
      disabled: button.hasAttribute('disabled'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('processing=false で通常テキストが表示されること', () => {
    // Arrange & Act
    render(<LogoutModal {...defaultProps} processing={false} />);
    const actual = screen.getByRole('button', { name: 'ログアウト' });

    // Assert
    expect(actual).toBeInTheDocument();
  });
});
