/**
 * TopNav コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
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

  it('検索バーが表示されること', () => {
    render(<TopNav />);
    expect(screen.getByPlaceholderText('検索...')).toBeInTheDocument();
  });

  it('ユーザー名が表示されること', () => {
    render(<TopNav />);
    expect(screen.getByText('田中太郎')).toBeInTheDocument();
  });

  it('ログアウトボタンが表示されること', () => {
    render(<TopNav />);
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
  });

  it('通知バッジに aria-label が設定されること', () => {
    render(<TopNav />);
    expect(screen.getByLabelText('通知')).toBeInTheDocument();
  });

  it('ログアウトボタンクリックでモーダルが表示されること', async () => {
    const user = userEvent.setup();
    render(<TopNav />);

    await user.click(screen.getByRole('button', { name: 'ログアウト' }));
    expect(screen.getByText('ログアウト確認')).toBeInTheDocument();
  });

  it('モーダルのログアウトボタンで router.post が呼ばれること', async () => {
    const user = userEvent.setup();
    render(<TopNav />);

    // モーダルを開く
    await user.click(screen.getByRole('button', { name: 'ログアウト' }));

    // モーダル内のログアウトボタンをクリック
    const buttons = screen.getAllByRole('button', { name: 'ログアウト' });
    // モーダル内のログアウトボタン（配列の末尾）をクリック
    await user.click(buttons[buttons.length - 1]!);

    expect(mockPost).toHaveBeenCalledWith(
      '/logout',
      {},
      expect.objectContaining({
        onError: expect.any(Function),
        onFinish: expect.any(Function),
      }),
    );
  });
});
