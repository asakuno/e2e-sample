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
    const action = vi.fn();
    const user = userEvent.setup();
    render(
      <PrimaryButton disabled action={action}>
        ログインする
      </PrimaryButton>,
    );
    await user.click(screen.getByRole('button'));
    expect(action).not.toHaveBeenCalled();
  });

  it('type="submit" がデフォルトであること', () => {
    render(<PrimaryButton>送信</PrimaryButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('action 指定時は button type で action が呼ばれること', async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<PrimaryButton action={action}>実行する</PrimaryButton>);

    const button = screen.getByRole('button', { name: '実行する' });
    expect(button).toHaveAttribute('type', 'button');

    await user.click(button);
    expect(action).toHaveBeenCalledOnce();
  });

  it('processingLabel を指定できること', () => {
    render(
      <PrimaryButton processing processingLabel="送信中...">
        送信する
      </PrimaryButton>,
    );
    expect(screen.getByRole('button', { name: '送信中...' })).toBeInTheDocument();
  });
});
