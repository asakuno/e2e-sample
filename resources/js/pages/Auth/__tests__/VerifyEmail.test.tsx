/**
 * メール認証ページテスト
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

// Inertia.js モック
const mockPost = vi.fn();

type MockVisitOptions = {
  onBefore?: (visit: unknown) => boolean | void;
  onSuccess?: () => void;
  onFinish?: (visit: unknown) => void;
};

vi.mock('@inertiajs/react', () => ({
  useForm: vi.fn(() => ({
    post: mockPost,
    processing: false,
  })),
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  usePage: vi.fn(() => ({ props: { flash: {} } })),
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
    mockPost.mockImplementation((_url: string, options: MockVisitOptions) => {
      const visit = {};
      const shouldContinue = options.onBefore?.(visit);

      if (shouldContinue === false) return;

      options.onSuccess?.();
      options.onFinish?.(visit);
    });
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

  it('再送ボタンクリックで post が呼ばれること', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<VerifyEmail />);

    // Act
    await user.click(screen.getByRole('button', { name: '認証メールを再送する' }));

    // Assert
    expect(mockPost).toHaveBeenCalledWith(
      '/email/verification-notification',
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it('再送リクエストが完了するまで送信中表示を維持すること', async () => {
    // Arrange
    const user = userEvent.setup();
    let finishRequest = () => {};
    mockPost.mockImplementationOnce((_url: string, options: MockVisitOptions) => {
      const visit = {};
      options.onBefore?.(visit);
      finishRequest = () => options.onFinish?.(visit);
    });
    const expected = {
      disabled: true,
      busy: 'true',
    };
    render(<VerifyEmail />);

    // Act
    await user.click(screen.getByRole('button', { name: '認証メールを再送する' }));
    const pendingButton = await screen.findByRole('button', { name: '送信中...' });
    const actual = {
      disabled: pendingButton.hasAttribute('disabled'),
      busy: pendingButton.getAttribute('aria-busy'),
    };

    // Assert
    expect(actual).toEqual(expected);

    await act(async () => {
      finishRequest();
    });
  });

  it('ページタイトルが「メール認証」であること', () => {
    render(<VerifyEmail />);
    expect(document.querySelector('title')).toHaveTextContent('メール認証');
  });
});
