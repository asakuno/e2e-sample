import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import { ActionLink } from '../ActionLink';

describe('ActionLink', () => {
  it('href がアンカーに設定されること', () => {
    // Arrange
    const expected = '/stocks';

    // Act
    render(
      <ActionLink href={expected} action={vi.fn()}>
        銘柄一覧
      </ActionLink>,
    );
    const actual = screen.getByRole('link', { name: '銘柄一覧' });

    // Assert
    expect(actual).toHaveAttribute('href', expected);
  });

  it('通常クリックした場合、action が呼ばれること', async () => {
    // Arrange
    const user = userEvent.setup();
    const action = vi.fn();
    const expected = 1;

    // Act
    render(
      <ActionLink href="/stocks" action={action}>
        銘柄一覧
      </ActionLink>,
    );
    await user.click(screen.getByRole('link', { name: '銘柄一覧' }));
    const actual = action.mock.calls.length;

    // Assert
    expect(actual).toBe(expected);
  });
});
