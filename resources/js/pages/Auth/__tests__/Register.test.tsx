/**
 * ユーザー新規登録ページテスト
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

// Inertia.js モック
const mockSetData = vi.fn();
const mockSubmit = vi.fn();
const mockValidate = vi.fn();

vi.mock('@inertiajs/react', () => ({
  useForm: vi.fn(() => ({
    data: { name: '', email: '', password: '', password_confirmation: '' },
    setData: mockSetData,
    processing: false,
    errors: {},
    withPrecognition: vi.fn().mockReturnValue({
      data: { name: '', email: '', password: '', password_confirmation: '' },
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

import Register from '../Register';

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('お名前入力欄が表示されること', () => {
    render(<Register />);
    expect(screen.getByLabelText('お名前')).toBeInTheDocument();
  });

  it('メールアドレス入力欄が表示されること', () => {
    render(<Register />);
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
  });

  it('パスワード入力欄が表示されること', () => {
    render(<Register />);
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
  });

  it('パスワード（確認用）入力欄が表示されること', () => {
    render(<Register />);
    expect(screen.getByLabelText('パスワード（確認用）')).toBeInTheDocument();
  });

  it('「アカウントを作成する」ボタンが表示されること', () => {
    render(<Register />);
    expect(screen.getByRole('button', { name: 'アカウントを作成する' })).toBeInTheDocument();
  });

  it('利用規約テキストが表示されること', () => {
    render(<Register />);
    expect(screen.getByText(/利用規約/)).toBeInTheDocument();
    expect(screen.getByText(/プライバシーポリシー/)).toBeInTheDocument();
  });

  it('「既にアカウントをお持ちの方はこちら」リンクが表示され href="/login" であること', () => {
    render(<Register />);
    const link = screen.getByText(/既にアカウントをお持ちの方はこちら/);
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/login');
  });

  it('フォーム送信で submit が呼ばれること', () => {
    render(<Register />);
    const form = screen.getByRole('button', { name: 'アカウントを作成する' }).closest('form');
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }
    expect(mockSubmit).toHaveBeenCalled();
  });

  it('ページタイトルが「新規会員登録」であること', () => {
    render(<Register />);
    expect(document.querySelector('title')).toHaveTextContent('新規会員登録');
  });
});
