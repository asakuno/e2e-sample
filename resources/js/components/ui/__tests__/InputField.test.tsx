/**
 * InputField コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { InputField } from '../InputField';

describe('InputField', () => {
  const defaultProps = {
    id: 'email',
    label: 'メールアドレス',
    value: '',
    onChange: vi.fn(),
  };

  it('ラベルが表示されること', () => {
    render(<InputField {...defaultProps} />);
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
  });

  it('入力値が表示されること', () => {
    render(<InputField {...defaultProps} value="test@example.com" />);
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('placeholder が表示されること', () => {
    render(<InputField {...defaultProps} placeholder="example@email.com" />);
    expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument();
  });

  it('onChange が呼ばれること', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<InputField {...defaultProps} onChange={onChange} />);
    await user.type(screen.getByLabelText('メールアドレス'), 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('エラーメッセージが表示されること', () => {
    render(<InputField {...defaultProps} error="必須項目です" />);
    expect(screen.getByText('必須項目です')).toBeInTheDocument();
  });

  it('エラー時に aria-invalid="true" が設定されること', () => {
    render(<InputField {...defaultProps} error="必須項目です" />);
    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute('aria-invalid', 'true');
  });

  it('エラー時に aria-describedby が設定されること', () => {
    render(<InputField {...defaultProps} error="必須項目です" />);
    expect(screen.getByLabelText('メールアドレス')).toHaveAttribute(
      'aria-describedby',
      'email-error',
    );
  });

  it('native input props と className が入力要素に渡されること', () => {
    // Arrange
    const expected = {
      inputMode: 'email' as const,
      maxLength: 120,
      dataField: 'account-email',
      className: 'custom-input',
    };

    // Act
    render(
      <InputField
        {...defaultProps}
        inputMode={expected.inputMode}
        maxLength={expected.maxLength}
        data-field={expected.dataField}
        className={expected.className}
      />,
    );
    const actual = screen.getByLabelText('メールアドレス');

    // Assert
    expect({
      inputMode: actual.getAttribute('inputmode'),
      maxLength: actual.getAttribute('maxlength'),
      dataField: actual.getAttribute('data-field'),
      hasClassName: actual.classList.contains(expected.className),
    }).toEqual({
      inputMode: expected.inputMode,
      maxLength: String(expected.maxLength),
      dataField: expected.dataField,
      hasClassName: true,
    });
  });

  it('既存の aria-describedby にエラーIDが追記されること', () => {
    // Arrange
    const expected = 'email-help email-error';

    // Act
    render(<InputField {...defaultProps} aria-describedby="email-help" error="必須項目です" />);
    const actual = screen.getByLabelText('メールアドレス').getAttribute('aria-describedby');

    // Assert
    expect(actual).toBe(expected);
  });
});
