/**
 * PrimaryButton コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { PrimaryButton } from '../PrimaryButton';

describe('PrimaryButton', () => {
  it('ボタンテキストが表示されること', () => {
    render(<PrimaryButton>ログインする</PrimaryButton>);
    expect(screen.getByRole('button', { name: 'ログインする' })).toBeInTheDocument();
  });

  it('processing 時に disabled になること', () => {
    render(<PrimaryButton processing>ログインする</PrimaryButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('processing 時にテキストが「処理中...」に変わること', () => {
    render(<PrimaryButton processing>ログインする</PrimaryButton>);
    expect(screen.getByRole('button', { name: '処理中...' })).toBeInTheDocument();
  });

  it('disabled 時にクリックできないこと', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <PrimaryButton disabled onClick={onClick}>
        ログインする
      </PrimaryButton>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('type="submit" がデフォルトであること', () => {
    render(<PrimaryButton>送信</PrimaryButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('processingLabel を指定できること', () => {
    render(
      <PrimaryButton processing processingLabel="送信中...">
        送信する
      </PrimaryButton>,
    );
    expect(screen.getByRole('button', { name: '送信中...' })).toBeInTheDocument();
  });

  it('native button props が透過されること', () => {
    // Arrange
    const expected = 'auth-submit';

    // Act
    render(<PrimaryButton data-testid={expected}>送信</PrimaryButton>);
    const actual = screen.getByTestId(expected);

    // Assert
    expect(actual).toHaveAttribute('type', 'submit');
  });
});
