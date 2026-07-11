import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { FieldDescription, FieldError, FieldLabel } from '../field';

describe('Field', () => {
  it('ラベルが入力欄と関連付けられること', () => {
    // Arrange
    const expected = '銘柄コード';

    // Act
    render(
      <>
        <FieldLabel htmlFor="symbol">{expected}</FieldLabel>
        <input id="symbol" />
      </>,
    );
    const actual = screen.getByLabelText(expected);

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('エラーが alert として通知されること', () => {
    // Arrange
    const expected = '入力内容を確認してください';

    // Act
    render(<FieldError>{expected}</FieldError>);
    const actual = screen.getByRole('alert');

    // Assert
    expect(actual).toHaveTextContent(expected);
  });

  it('補足説明が表示されること', () => {
    // Arrange
    const expected = '半角英数字で入力してください';

    // Act
    render(<FieldDescription>{expected}</FieldDescription>);
    const actual = screen.getByText(expected);

    // Assert
    expect(actual).toBeInTheDocument();
  });
});
