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
  useForm: vi.fn((data: Record<string, string>) => ({
    withPrecognition: vi.fn(() => ({
      data,
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

import ResetPassword from '../ResetPassword';

describe('ResetPassword', () => {
  const defaultProps = {
    email: 'investor@example.com',
    token: 'reset-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    formState.processing = false;
    formState.hasErrors = false;
    formState.errors = {};
  });

  it('再設定リンクに含まれるメールアドレスが初期表示されること', () => {
    // Arrange
    const expected = defaultProps.email;

    // Act
    render(<ResetPassword {...defaultProps} />);
    const actual = screen.getByLabelText('メールアドレス').getAttribute('value');

    // Assert
    expect(actual).toBe(expected);
  });

  it('新しいパスワードと確認用パスワードを入力できること', () => {
    // Arrange
    const expected = {
      password: 'password',
      confirmation: 'password',
    };

    // Act
    render(<ResetPassword {...defaultProps} />);
    const actual = {
      password: screen.getByLabelText('新しいパスワード').getAttribute('type'),
      confirmation: screen.getByLabelText('新しいパスワード（確認用）').getAttribute('type'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('パスワード変更フォームを送信した場合、再設定リクエストが実行されること', () => {
    // Arrange
    render(<ResetPassword {...defaultProps} />);
    const form = screen.getByRole('button', { name: 'パスワードを変更する' }).closest('form');

    // Act
    fireEvent.submit(form as HTMLFormElement);
    const actual = formMocks.submit.mock.calls.length;

    // Assert
    expect(actual).toBe(1);
  });

  it('新しいパスワード入力欄からフォーカスが外れた場合、入力内容が検証されること', () => {
    // Arrange
    const expected = 'password';
    render(<ResetPassword {...defaultProps} />);

    // Act
    fireEvent.blur(screen.getByLabelText('新しいパスワード'));
    const actual = formMocks.validate.mock.calls[0]?.[0];

    // Assert
    expect(actual).toBe(expected);
  });

  it('パスワードに検証エラーがある場合、エラーメッセージが表示されること', () => {
    // Arrange
    const expected = '確認用パスワードと一致しません。';
    formState.errors = { password: expected };

    // Act
    render(<ResetPassword {...defaultProps} />);
    const actual = screen.getByRole('alert').textContent;

    // Assert
    expect(actual).toBe(expected);
  });

  it('変更処理中の場合、送信ボタンが無効になること', () => {
    // Arrange
    formState.processing = true;
    const expected = true;

    // Act
    render(<ResetPassword {...defaultProps} />);
    const actual = screen.getByRole('button', { name: '変更中...' }).hasAttribute('disabled');

    // Assert
    expect(actual).toBe(expected);
  });

  it('入力内容に検証エラーがある場合、送信ボタンが無効になること', () => {
    // Arrange
    formState.hasErrors = true;
    const expected = true;

    // Act
    render(<ResetPassword {...defaultProps} />);
    const actual = screen
      .getByRole('button', { name: 'パスワードを変更する' })
      .hasAttribute('disabled');

    // Assert
    expect(actual).toBe(expected);
  });

  it('ログイン画面へ戻るリンクが表示されること', () => {
    // Arrange
    const expected = '/login';

    // Act
    render(<ResetPassword {...defaultProps} />);
    const actual = screen.getByRole('link', { name: 'ログイン画面に戻る' }).getAttribute('href');

    // Assert
    expect(actual).toBe(expected);
  });
});
