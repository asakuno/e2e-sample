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
    // Arrange
    const user = userEvent.setup();
    render(<PasswordInput {...defaultProps} />);
    const toggleButton = screen.getByRole('button', { name: 'パスワードを表示' });

    // Act
    await user.click(toggleButton);
    const actual = screen.getByLabelText('パスワード').getAttribute('type');

    // Assert
    expect(actual).toBe('text');
  });

  it('再度クリックで type が password に戻ること', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PasswordInput {...defaultProps} />);
    const toggleButton = screen.getByRole('button', { name: 'パスワードを表示' });

    // Act
    await user.click(toggleButton);
    const hideButton = screen.getByRole('button', { name: 'パスワードを非表示' });
    await user.click(hideButton);
    const actual = screen.getByLabelText('パスワード').getAttribute('type');

    // Assert
    expect(actual).toBe('password');
  });

  it('エラーメッセージが表示されること', () => {
    render(<PasswordInput {...defaultProps} error="パスワードは必須です" />);
    expect(screen.getByText('パスワードは必須です')).toBeInTheDocument();
  });

  it('エラー時に aria-invalid="true" が設定されること', () => {
    render(<PasswordInput {...defaultProps} error="エラー" />);
    expect(screen.getByLabelText('パスワード')).toHaveAttribute('aria-invalid', 'true');
  });

  it('defaultVisible が true の場合、初期表示が text になること', () => {
    // Arrange & Act
    render(<PasswordInput {...defaultProps} defaultVisible />);
    const actual = screen.getByLabelText('パスワード').getAttribute('type');

    // Assert
    expect(actual).toBe('text');
  });

  it('controlled の表示切替時に onVisibleChange が通知されること', async () => {
    // Arrange
    const user = userEvent.setup();
    const onVisibleChange = vi.fn();
    const expected = true;
    render(<PasswordInput {...defaultProps} visible={false} onVisibleChange={onVisibleChange} />);

    // Act
    await user.click(screen.getByRole('button', { name: 'パスワードを表示' }));
    const actual = onVisibleChange.mock.calls[0]?.[0];

    // Assert
    expect(actual).toBe(expected);
  });

  it('native input props と既存 aria-describedby が入力要素に渡されること', () => {
    // Arrange
    const expected = {
      maxLength: 64,
      describedBy: 'password-help password-error',
    };

    // Act
    render(
      <PasswordInput
        {...defaultProps}
        maxLength={expected.maxLength}
        aria-describedby="password-help"
        error="エラー"
        data-field="password"
      />,
    );
    const input = screen.getByLabelText('パスワード');
    const actual = {
      maxLength: input.getAttribute('maxlength'),
      describedBy: input.getAttribute('aria-describedby'),
      dataField: input.getAttribute('data-field'),
    };

    // Assert
    expect(actual).toEqual({
      maxLength: String(expected.maxLength),
      describedBy: expected.describedBy,
      dataField: 'password',
    });
  });
});
