import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';

const routerVisitMock = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
  router: {
    visit: routerVisitMock,
  },
}));

import { InertiaActionLink } from '../InertiaActionLink';

describe('InertiaActionLink', () => {
  it('通常クリック時に href と同じURLへ Inertia 遷移すること', async () => {
    // Arrange
    const user = userEvent.setup();
    const expected = '/stocks/10';
    routerVisitMock.mockImplementationOnce(
      (_href: string, options: { onFinish?: (visit: unknown) => void }) => {
        options.onFinish?.({});
      },
    );
    render(
      <InertiaActionLink href={expected} visitOptions={{ preserveScroll: true }}>
        銘柄詳細
      </InertiaActionLink>,
    );

    // Act
    await user.click(screen.getByRole('link', { name: '銘柄詳細' }));
    const actual = routerVisitMock.mock.calls[0];

    // Assert
    expect(actual).toEqual([
      expected,
      expect.objectContaining({
        preserveScroll: true,
        onBefore: expect.any(Function),
        onFinish: expect.any(Function),
      }),
    ]);
  });
});
