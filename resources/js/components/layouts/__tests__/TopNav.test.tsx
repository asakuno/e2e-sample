/**
 * TopNav コンポーネントテスト
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mockPost = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
  router: {
    post: mockPost,
  },
  usePage: vi.fn(() => ({
    props: {
      auth: {
        user: { id: 1, name: '田中太郎' },
      },
    },
  })),
}));

import { TopNav } from '../TopNav';

describe('TopNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ユーザー名が表示されること', () => {
    // Arrange & Act
    render(<TopNav navigationOpen={false} onNavigationOpenChange={vi.fn()} />);
    const actual = screen.getByText('田中太郎');

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('ログアウトボタンが表示されること', () => {
    // Arrange & Act
    render(<TopNav navigationOpen={false} onNavigationOpenChange={vi.fn()} />);
    const actual = screen.getByRole('button', { name: 'ログアウト' });

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('未接続の検索・通知・市場状態コントロールが表示されないこと', () => {
    // Arrange
    const expected = {
      search: null,
      notifications: null,
      marketStatus: null,
    };

    // Act
    render(<TopNav navigationOpen={false} onNavigationOpenChange={vi.fn()} />);
    const actual = {
      search: screen.queryByRole('textbox'),
      notifications: screen.queryByLabelText('アラート通知'),
      marketStatus: screen.queryByText('Market Open'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('モバイルメニューボタンを押した場合、開く要求を通知すること', async () => {
    // Arrange
    const onNavigationOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<TopNav navigationOpen={false} onNavigationOpenChange={onNavigationOpenChange} />);
    const expected = true;

    // Act
    await user.click(screen.getByRole('button', { name: 'メニューを開く' }));
    const actual = onNavigationOpenChange.mock.calls[0]?.[0];

    // Assert
    expect(actual).toBe(expected);
  });

  it('ログアウトボタンクリックでモーダルが表示されること', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<TopNav navigationOpen={false} onNavigationOpenChange={vi.fn()} />);

    // Act
    await user.click(screen.getByRole('button', { name: 'ログアウト' }));
    const actual = screen.getByRole('dialog');

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('モーダルのログアウトボタンで router.post が呼ばれること', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<TopNav navigationOpen={false} onNavigationOpenChange={vi.fn()} />);

    // Act
    await user.click(screen.getByRole('button', { name: 'ログアウト' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'ログアウト' }));

    // Assert
    expect(mockPost).toHaveBeenCalledWith(
      '/logout',
      {},
      expect.objectContaining({
        onFinish: expect.any(Function),
      }),
    );
  });
});
