import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const formMocks = vi.hoisted(() => ({
  setData: vi.fn(),
  submit: vi.fn(),
  validate: vi.fn(),
}));

const formState = vi.hoisted(() => ({
  processing: false,
  errors: {} as Record<string, string>,
}));

vi.mock('@inertiajs/react', () => ({
  useForm: vi.fn(() => ({
    withPrecognition: vi.fn(() => ({
      data: { email: '', password: '' },
      setData: formMocks.setData,
      submit: formMocks.submit,
      processing: formState.processing,
      errors: formState.errors,
      validate: formMocks.validate,
    })),
  })),
  usePage: vi.fn(() => ({ props: { flash: {} } })),
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  router: { visit: vi.fn() },
}));

import Login from '../Login';

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formState.processing = false;
    formState.errors = {};
  });

  it('ログインに必要な入力欄が表示されること', () => {
    // Arrange
    const expected = {
      email: 'email',
      password: 'password',
    };

    // Act
    render(<Login />);
    const actual = {
      email: screen.getByLabelText('メールアドレス').getAttribute('type'),
      password: screen.getByLabelText('パスワード').getAttribute('type'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('パスワードを忘れた場合、再設定申請画面へのリンクが表示されること', () => {
    // Arrange
    const expected = '/forgot-password';

    // Act
    render(<Login />);
    const actual = screen
      .getByRole('link', { name: 'パスワードをお忘れですか？' })
      .getAttribute('href');

    // Assert
    expect(actual).toBe(expected);
  });

  it('アカウントがない場合、新規登録画面へのリンクが表示されること', () => {
    // Arrange
    const expected = '/register';

    // Act
    render(<Login />);
    const actual = screen.getByRole('link', { name: '新規登録はこちら' }).getAttribute('href');

    // Assert
    expect(actual).toBe(expected);
  });

  it('パスワード再設定後のstatusが渡された場合、完了メッセージが表示されること', () => {
    // Arrange
    const expected = 'パスワードを再設定しました。';

    // Act
    render(<Login status={expected} />);
    const actual = screen.getByRole('status').textContent;

    // Assert
    expect(actual).toBe(expected);
  });

  it('statusがない場合、ページ固有の完了メッセージを表示しないこと', () => {
    // Arrange & Act
    render(<Login />);
    const actual = screen.queryByRole('status');

    // Assert
    expect(actual).not.toBeInTheDocument();
  });

  it('ログインフォームを送信した場合、認証リクエストが実行されること', () => {
    // Arrange
    render(<Login />);
    const form = screen.getByRole('button', { name: 'ログインする' }).closest('form');

    // Act
    fireEvent.submit(form as HTMLFormElement);
    const actual = formMocks.submit.mock.calls.length;

    // Assert
    expect(actual).toBe(1);
  });

  it('メールアドレス入力欄からフォーカスが外れた場合、入力内容が検証されること', () => {
    // Arrange
    const expected = 'email';
    render(<Login />);

    // Act
    fireEvent.blur(screen.getByLabelText('メールアドレス'));
    const actual = formMocks.validate.mock.calls[0]?.[0];

    // Assert
    expect(actual).toBe(expected);
  });

  it('ログイン処理中の場合、送信ボタンが無効になること', () => {
    // Arrange
    formState.processing = true;
    const expected = true;

    // Act
    render(<Login />);
    const actual = screen.getByRole('button', { name: '処理中...' }).hasAttribute('disabled');

    // Assert
    expect(actual).toBe(expected);
  });

  it('メールアドレスに検証エラーがある場合、エラーメッセージが表示されること', () => {
    // Arrange
    const expected = 'メールアドレスの形式が正しくありません。';
    formState.errors = { email: expected };

    // Act
    render(<Login />);
    const actual = screen.getByRole('alert').textContent;

    // Assert
    expect(actual).toBe(expected);
  });

  it('ページタイトルがログインであること', () => {
    // Arrange
    const expected = 'ログイン';

    // Act
    render(<Login />);
    const actual = document.querySelector('title')?.textContent;

    // Assert
    expect(actual).toBe(expected);
  });
});
