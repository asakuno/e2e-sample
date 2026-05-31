/**
 * LogoutModal コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LogoutModal } from '../LogoutModal';

describe('LogoutModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onLogout: vi.fn(),
    processing: false,
  };

  it('open=true でモーダルが表示されること', () => {
    render(<LogoutModal {...defaultProps} />);
    expect(screen.getByText('ログアウト確認')).toBeInTheDocument();
    expect(
      screen.getByText(/ログアウトしてもよろしいですか/),
    ).toBeInTheDocument();
  });

  it('open=false でモーダルが非表示であること', () => {
    render(<LogoutModal {...defaultProps} open={false} />);
    expect(screen.queryByText('ログアウト確認')).not.toBeInTheDocument();
  });

  it('ログアウトボタンクリックで onLogout が呼ばれること', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<LogoutModal {...defaultProps} onLogout={onLogout} />);

    await user.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('キャンセルクリックで onClose が呼ばれること', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<LogoutModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('processing=true でログアウトボタンが無効化されること', () => {
    render(<LogoutModal {...defaultProps} processing={true} />);
    expect(screen.getByRole('button', { name: 'ログアウト中...' })).toBeDisabled();
  });

  it('processing=true でスピナーとテキストが表示されること', () => {
    render(<LogoutModal {...defaultProps} processing={true} />);
    expect(screen.getByText('ログアウト中...')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'ログアウト中...' });
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('processing=false で通常テキストが表示されること', () => {
    render(<LogoutModal {...defaultProps} processing={false} />);
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
    expect(screen.queryByText('ログアウト中...')).not.toBeInTheDocument();
  });
});
