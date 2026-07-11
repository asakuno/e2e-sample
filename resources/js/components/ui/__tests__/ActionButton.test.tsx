import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Component, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { ActionButton } from '../ActionButton';
import { ActionScope, type ActionCallback } from '../ActionScope';

type TestErrorBoundaryProps = {
  children: ReactNode;
};

type TestErrorBoundaryState = {
  hasError: boolean;
};

class TestErrorBoundary extends Component<TestErrorBoundaryProps, TestErrorBoundaryState> {
  state: TestErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? <div role="alert">エラー</div> : this.props.children;
  }
}

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

  it('await 後に action context の transition を呼び出せること', async () => {
    // Arrange
    const user = userEvent.setup();
    const transitionCallback = vi.fn();
    const action: ActionCallback = async ({ transition }) => {
      await Promise.resolve();
      transition(transitionCallback);
    };
    const expected = 1;

    // Act
    render(<ActionButton action={action}>保存</ActionButton>);
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => {
      const actual = transitionCallback.mock.calls.length;

      expect(actual).toBe(expected);
    });
  });

  it('ActionScope 配下の action が失敗した場合、onError が呼ばれること', async () => {
    // Arrange
    const user = userEvent.setup();
    const expected = new Error('保存に失敗しました');
    const onError = vi.fn();
    const action: ActionCallback = async () => {
      await Promise.resolve();
      throw expected;
    };

    // Act
    render(
      <TestErrorBoundary>
        <ActionScope onError={onError}>
          <ActionButton action={action}>保存</ActionButton>
        </ActionScope>
      </TestErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => {
      const actual = onError.mock.calls[0]?.[0];

      expect(actual).toBe(expected);
    });
  });

  it('disableWhilePending が false の場合、pending 中でも disabled にならないこと', async () => {
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
      <ActionButton action={action} disableWhilePending={false}>
        移動
      </ActionButton>,
    );
    const actual = screen.getByRole('button', { name: '移動' });
    await user.click(actual);

    // Assert
    expect(actual).not.toBeDisabled();

    await act(async () => {
      resolveAction();
    });
  });
});
