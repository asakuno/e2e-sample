/**
 * ログインページテスト
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

// Inertia.js モック
const mockPost = vi.fn();
const mockSetData = vi.fn();

const mockSubmit = vi.fn();
const mockValidate = vi.fn();

vi.mock('@inertiajs/react', () => ({
  useForm: vi.fn(() => ({
    data: { email: '', password: '' },
    setData: mockSetData,
    post: mockPost,
    processing: false,
    errors: {},
    withPrecognition: vi.fn().mockReturnValue({
      data: { email: '', password: '' },
      setData: mockSetData,
      submit: mockSubmit,
      processing: false,
      errors: {},
      validate: mockValidate,
    }),
  })),
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}));

import Login from '../Login';

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('メールアドレス入力欄が表示されること', () => {
    render(<Login />);
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
  });

  it('パスワード入力欄が表示されること', () => {
    render(<Login />);
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
  });

  it('ログインボタンが表示されること', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: 'ログインする' })).toBeInTheDocument();
  });

  it('「パスワードをお忘れですか？」リンクが表示されること', () => {
    render(<Login />);
    expect(screen.getByText('パスワードをお忘れですか？')).toBeInTheDocument();
  });

  it('「新規登録はこちら」リンクが表示されること', () => {
    render(<Login />);
    expect(screen.getByText('新規登録はこちら')).toBeInTheDocument();
  });

  it('フォーム送信で post が呼ばれること', () => {
    render(<Login />);
    const form = screen.getByRole('button', { name: 'ログインする' }).closest('form');
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }
    expect(mockSubmit).toHaveBeenCalled();
  });

  it('ページタイトルが設定されること', () => {
    render(<Login />);
    expect(document.querySelector('title')).toHaveTextContent('ログイン');
  });
});
