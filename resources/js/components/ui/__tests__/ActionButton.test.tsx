import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { ActionButton } from '../ActionButton';
import { ActionScope } from '../ActionScope';

describe('ActionButton', () => {
  it('クリックした場合、action が呼ばれること', async () => {
    // Arrange
    const user = userEvent.setup();
    const action = vi.fn();
    const expected = 1;

    // Act
    render(<ActionButton action={action}>実行</ActionButton>);
    await user.click(screen.getByRole('button', { name: '実行' }));
    const actual = action.mock.calls.length;

    // Assert
    expect(actual).toBe(expected);
  });

  it('action が処理中の場合、pendingLabel が表示されること', async () => {
    // Arrange
    const user = userEvent.setup();
    const action = vi.fn(() => new Promise<void>(() => {}));
    const expected = '処理中';

    // Act
    render(
      <ActionButton action={action} pendingLabel={expected}>
        実行
      </ActionButton>,
    );
    await user.click(screen.getByRole('button', { name: '実行' }));
    const actual = await screen.findByRole('button', { name: expected });

    // Assert
    expect(actual).toBeDisabled();
  });

  it('ActionScope 配下の場合、処理中の pending が兄弟ボタンにも共有されること', async () => {
    // Arrange
    const user = userEvent.setup();
    let resolveAction: () => void = () => {};
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
    );

    // Act
    render(
      <ActionScope>
        <ActionButton action={action}>保存</ActionButton>
        <ActionButton action={vi.fn()}>削除</ActionButton>
      </ActionScope>,
    );
    await user.click(screen.getByRole('button', { name: '保存' }));
    const actual = screen.getByRole('button', { name: '削除' });

    // Assert
    expect(actual).toBeDisabled();

    await act(async () => {
      resolveAction();
    });
  });
});
