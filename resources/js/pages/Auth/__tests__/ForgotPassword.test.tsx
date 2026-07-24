import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const formMocks = vi.hoisted(() => ({
  setData: vi.fn(),
  submit: vi.fn(),
  validate: vi.fn(),
}));

const formState = vi.hoisted(() => ({
  processing: false,
  hasErrors: false,
  errors: {} as Record<string, string>,
}));

vi.mock('@inertiajs/react', () => ({
  useForm: vi.fn(() => ({
    withPrecognition: vi.fn(() => ({
      data: { email: '' },
      setData: formMocks.setData,
      submit: formMocks.submit,
      processing: formState.processing,
      hasErrors: formState.hasErrors,
      errors: formState.errors,
      validate: formMocks.validate,
    })),
  })),
  usePage: vi.fn(() => ({ props: { flash: {} } })),
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  router: { visit: vi.fn() },
}));

import ForgotPassword from '../ForgotPassword';

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formState.processing = false;
    formState.hasErrors = false;
    formState.errors = {};
  });

  it('再設定リンクの送信先となるメールアドレスを入力できること', () => {
    // Arrange
    const expected = 'email';

    // Act
    render(<ForgotPassword />);
    const actual = screen.getByLabelText('メールアドレス').getAttribute('type');

    // Assert
    expect(actual).toBe(expected);
  });

  it('statusが渡された場合、送信完了メッセージが表示されること', () => {
    // Arrange
    const expected = 'パスワード再設定リンクを送信しました。';

    // Act
    render(<ForgotPassword status={expected} />);
    const actual = screen.getByRole('status').textContent;

    // Assert
    expect(actual).toBe(expected);
  });

  it('再設定リンク送信フォームを送信した場合、申請リクエストが実行されること', () => {
    // Arrange
    render(<ForgotPassword />);
    const form = screen.getByRole('button', { name: '再設定リンクを送信する' }).closest('form');

    // Act
    fireEvent.submit(form as HTMLFormElement);
    const actual = formMocks.submit.mock.calls.length;

    // Assert
    expect(actual).toBe(1);
  });

  it('メールアドレス入力欄からフォーカスが外れた場合、入力内容が検証されること', () => {
    // Arrange
    const expected = 'email';
    render(<ForgotPassword />);

    // Act
    fireEvent.blur(screen.getByLabelText('メールアドレス'));
    const actual = formMocks.validate.mock.calls[0]?.[0];

    // Assert
    expect(actual).toBe(expected);
  });

  it('メールアドレスに検証エラーがある場合、エラーメッセージが表示されること', () => {
    // Arrange
    const expected = 'メールアドレスは必須です。';
    formState.errors = { email: expected };

    // Act
    render(<ForgotPassword />);
    const actual = screen.getByRole('alert').textContent;

    // Assert
    expect(actual).toBe(expected);
  });

  it('申請処理中の場合、送信ボタンが無効になること', () => {
    // Arrange
    formState.processing = true;
    const expected = true;

    // Act
    render(<ForgotPassword />);
    const actual = screen.getByRole('button', { name: '送信中...' }).hasAttribute('disabled');

    // Assert
    expect(actual).toBe(expected);
  });

  it('入力内容に検証エラーがある場合、送信ボタンが無効になること', () => {
    // Arrange
    formState.hasErrors = true;
    const expected = true;

    // Act
    render(<ForgotPassword />);
    const actual = screen
      .getByRole('button', { name: '再設定リンクを送信する' })
      .hasAttribute('disabled');

    // Assert
    expect(actual).toBe(expected);
  });

  it('ログイン画面へ戻るリンクが表示されること', () => {
    // Arrange
    const expected = '/login';

    // Act
    render(<ForgotPassword />);
    const actual = screen.getByRole('link', { name: 'ログイン画面に戻る' }).getAttribute('href');

    // Assert
    expect(actual).toBe(expected);
  });
});
