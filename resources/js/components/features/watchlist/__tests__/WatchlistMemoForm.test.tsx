import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { WatchlistMemoForm } from '../WatchlistMemoForm';

describe('WatchlistMemoForm', () => {
  const priorityOptions = [
    { value: 1, label: '低' },
    { value: 2, label: '中' },
    { value: 3, label: '高' },
  ];

  it('現在のメモと優先度が表示されること', () => {
    // Arrange
    const expected = {
      memo: '決算前に確認',
      priority: '3',
    };

    // Act
    render(
      <WatchlistMemoForm
        memo="決算前に確認"
        priority={3}
        priorityOptions={priorityOptions}
        onMemoChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const actual = {
      memo: (screen.getByLabelText('メモ') as HTMLTextAreaElement).value,
      priority: (screen.getByLabelText('優先度') as HTMLSelectElement).value,
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('メモを変更した場合、onMemoChange が呼ばれること', () => {
    // Arrange
    const onMemoChange = vi.fn();
    const expected = '新しいメモ';

    // Act
    render(
      <WatchlistMemoForm
        memo=""
        priority={2}
        priorityOptions={priorityOptions}
        onMemoChange={onMemoChange}
        onPriorityChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('メモ'), { target: { value: expected } });
    const firstCall = onMemoChange.mock.calls[0];
    const actual = firstCall?.[0];

    // Assert
    expect(actual).toBe(expected);
  });

  it('送信した場合、onSubmit が呼ばれること', () => {
    // Arrange
    const onSubmit = vi.fn();
    const expected = 1;

    // Act
    render(
      <WatchlistMemoForm
        memo=""
        priority={2}
        priorityOptions={priorityOptions}
        onMemoChange={vi.fn()}
        onPriorityChange={vi.fn()}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    const actual = onSubmit.mock.calls.length;

    // Assert
    expect(actual).toBe(expected);
  });
});
