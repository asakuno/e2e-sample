import { fireEvent, render, screen } from '@testing-library/react';
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

  it('metaKey クリックの場合、action が呼ばれないこと', () => {
    // Arrange
    const action = vi.fn();
    const expected = 0;

    // Act
    render(
      <ActionLink href="#stocks" action={action}>
        銘柄一覧
      </ActionLink>,
    );
    clickWithoutNavigation(screen.getByRole('link', { name: '銘柄一覧' }), { metaKey: true });
    const actual = action.mock.calls.length;

    // Assert
    expect(actual).toBe(expected);
  });

  it('target が _blank の場合、action が呼ばれないこと', () => {
    // Arrange
    const action = vi.fn();
    const expected = 0;

    // Act
    render(
      <ActionLink href="#stocks-blank" target="_blank" action={action}>
        銘柄一覧
      </ActionLink>,
    );
    clickWithoutNavigation(screen.getByRole('link', { name: '銘柄一覧' }));
    const actual = action.mock.calls.length;

    // Assert
    expect(actual).toBe(expected);
  });

  it('download 属性がある場合、action が呼ばれないこと', () => {
    // Arrange
    const action = vi.fn();
    const expected = 0;

    // Act
    render(
      <ActionLink href="#stocks.csv" download action={action}>
        CSVダウンロード
      </ActionLink>,
    );
    clickWithoutNavigation(screen.getByRole('link', { name: 'CSVダウンロード' }));
    const actual = action.mock.calls.length;

    // Assert
    expect(actual).toBe(expected);
  });
});

function clickWithoutNavigation(element: HTMLElement, init?: MouseEventInit) {
  const preventNavigation = (event: Event) => {
    event.preventDefault();
  };

  document.addEventListener('click', preventNavigation);

  try {
    fireEvent.click(element, init);
  } finally {
    document.removeEventListener('click', preventNavigation);
  }
}
