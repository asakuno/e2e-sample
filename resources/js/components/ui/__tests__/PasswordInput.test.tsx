/**
 * PasswordInput コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { PasswordInput } from '../PasswordInput';

describe('PasswordInput', () => {
  const defaultProps = {
    id: 'password',
    label: 'パスワード',
    value: '',
    onChange: vi.fn(),
  };

  it('パスワード入力が表示されること', () => {
    render(<PasswordInput {...defaultProps} />);
    const input = screen.getByLabelText('パスワード');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'password');
  });

  it('目アイコンクリックで type が text に変わること', async () => {
    const user = userEvent.setup();
    render(<PasswordInput {...defaultProps} />);
    const toggleButton = screen.getByRole('button', { name: 'パスワードを表示' });
    await user.click(toggleButton);
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('type', 'text');
  });

  it('再度クリックで type が password に戻ること', async () => {
    const user = userEvent.setup();
    render(<PasswordInput {...defaultProps} />);
    const toggleButton = screen.getByRole('button', { name: 'パスワードを表示' });
    await user.click(toggleButton);
    const hideButton = screen.getByRole('button', { name: 'パスワードを非表示' });
    await user.click(hideButton);
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('type', 'password');
  });

  it('エラーメッセージが表示されること', () => {
    render(<PasswordInput {...defaultProps} error="パスワードは必須です" />);
    expect(screen.getByText('パスワードは必須です')).toBeInTheDocument();
  });

  it('エラー時に aria-invalid="true" が設定されること', () => {
    render(<PasswordInput {...defaultProps} error="エラー" />);
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('aria-invalid', 'true');
  });
});
