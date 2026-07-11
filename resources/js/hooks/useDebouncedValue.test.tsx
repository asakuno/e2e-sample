import { act, cleanup, render, screen } from '@testing-library/react';
import { useTransition } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useDebouncedValue } from './useDebouncedValue';

type DebouncedValueHarnessProps = {
  value: string;
  intervalMs: number;
};

function DebouncedValueHarness({ value, intervalMs }: DebouncedValueHarnessProps) {
  const [isPending, startTransition] = useTransition();
  const debouncedValue = useDebouncedValue(value, { intervalMs, startTransition });

  return (
    <>
      <output aria-label="反映済みの値">{debouncedValue}</output>
      <div role="status" aria-label="更新状態">
        {isPending ? '処理中' : '待機中'}
      </div>
    </>
  );
}

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('初回マウント時は pending にならず、タイマーも開始されないこと', () => {
    // Arrange
    const value = 'A';
    const expected = { debouncedValue: value, status: '待機中', timerCount: 0 };

    // Act
    render(<DebouncedValueHarness value={value} intervalMs={100} />);
    const actual = {
      debouncedValue: screen.getByLabelText('反映済みの値').textContent,
      status: screen.getByRole('status', { name: '更新状態' }).textContent,
      timerCount: vi.getTimerCount(),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('入力値を変更した場合、反映待ちの間は pending になること', async () => {
    // Arrange
    const intervalMs = 100;
    const expected = { debouncedValue: 'A', status: '処理中', timerCount: 1 };
    const { rerender } = render(<DebouncedValueHarness value="A" intervalMs={intervalMs} />);

    // Act
    rerender(<DebouncedValueHarness value="B" intervalMs={intervalMs} />);
    const actual = {
      debouncedValue: screen.getByLabelText('反映済みの値').textContent,
      status: screen.getByRole('status', { name: '更新状態' }).textContent,
      timerCount: vi.getTimerCount(),
    };
    await advanceTimersByTime(intervalMs);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('短時間に複数回変更した場合、最後の値だけが interval 経過後に反映されること', async () => {
    // Arrange
    const intervalMs = 100;
    const expected = { atFirstDeadline: 'A', atLastDeadline: 'C' };
    const { rerender } = render(<DebouncedValueHarness value="A" intervalMs={intervalMs} />);

    // Act
    rerender(<DebouncedValueHarness value="B" intervalMs={intervalMs} />);
    await advanceTimersByTime(intervalMs / 2);
    rerender(<DebouncedValueHarness value="C" intervalMs={intervalMs} />);
    await advanceTimersByTime(intervalMs / 2);
    const atFirstDeadline = screen.getByLabelText('反映済みの値').textContent;
    await advanceTimersByTime(intervalMs / 2);
    const atLastDeadline = screen.getByLabelText('反映済みの値').textContent;
    const actual = { atFirstDeadline, atLastDeadline };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('A から B を経て A に戻した場合、保留中の更新を取り消して新たなタイマーを作らないこと', async () => {
    // Arrange
    const intervalMs = 100;
    const expected = {
      timerCountBeforeReturn: 1,
      timerCountAfterReturn: 0,
      debouncedValue: 'A',
      status: '待機中',
    };
    const { rerender } = render(<DebouncedValueHarness value="A" intervalMs={intervalMs} />);
    rerender(<DebouncedValueHarness value="B" intervalMs={intervalMs} />);
    const timerCountBeforeReturn = vi.getTimerCount();

    // Act
    rerender(<DebouncedValueHarness value="A" intervalMs={intervalMs} />);
    await flushTransition();
    const actual = {
      timerCountBeforeReturn,
      timerCountAfterReturn: vi.getTimerCount(),
      debouncedValue: screen.getByLabelText('反映済みの値').textContent,
      status: screen.getByRole('status', { name: '更新状態' }).textContent,
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('unmount した場合、保留中のタイマーがキャンセルされること', async () => {
    // Arrange
    const intervalMs = 100;
    const expected = { beforeUnmount: 1, afterUnmount: 0 };
    const { rerender, unmount } = render(
      <DebouncedValueHarness value="A" intervalMs={intervalMs} />,
    );
    rerender(<DebouncedValueHarness value="B" intervalMs={intervalMs} />);
    const beforeUnmount = vi.getTimerCount();

    // Act
    await act(async () => {
      unmount();
    });
    const actual = { beforeUnmount, afterUnmount: vi.getTimerCount() };

    // Assert
    expect(actual).toEqual(expected);
  });
});

async function advanceTimersByTime(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

async function flushTransition() {
  await act(async () => {
    await Promise.resolve();
  });
}
