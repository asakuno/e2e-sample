/**
 * メール認証ページテスト
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

// Inertia.js モック
const mockPost = vi.fn();

vi.mock('@inertiajs/react', () => ({
  useForm: vi.fn(() => ({
    post: mockPost,
    processing: false,
  })),
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}));

import VerifyEmail from '../VerifyEmail';

describe('VerifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('メール認証の説明テキストが表示されること', () => {
    render(<VerifyEmail />);
    expect(
      screen.getByText(/登録いただいたメールアドレスに認証リンクを送信しました/),
    ).toBeInTheDocument();
  });

  it('「認証メールを再送する」ボタンが表示されること', () => {
    render(<VerifyEmail />);
    expect(screen.getByRole('button', { name: '認証メールを再送する' })).toBeInTheDocument();
  });

  it('status="verification-link-sent" で再送メッセージが表示されること', () => {
    render(<VerifyEmail status="verification-link-sent" />);
    expect(screen.getByText(/認証リンクを再送しました/)).toBeInTheDocument();
  });

  it('status が未設定の場合は再送メッセージが表示されないこと', () => {
    render(<VerifyEmail />);
    expect(screen.queryByText(/認証リンクを再送しました/)).not.toBeInTheDocument();
  });

  it('再送ボタンクリックで post が呼ばれること', () => {
    render(<VerifyEmail />);
    fireEvent.click(screen.getByRole('button', { name: '認証メールを再送する' }));
    expect(mockPost).toHaveBeenCalledWith(
      '/email/verification-notification',
      expect.objectContaining({
        onFinish: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
    );
  });

  it('ページタイトルが「メール認証」であること', () => {
    render(<VerifyEmail />);
    expect(document.querySelector('title')).toHaveTextContent('メール認証');
  });
});
