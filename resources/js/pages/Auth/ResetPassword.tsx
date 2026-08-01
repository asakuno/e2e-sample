import { Head, Link, useForm } from '@inertiajs/react';
import type React from 'react';
import { showLogin } from '@/actions/App/Http/Controllers/Web/AuthPageController';
import { resetPassword } from '@/actions/App/Http/Controllers/Web/PasswordResetPageController';
import { InputField } from '@/components/ui/InputField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GuestLayout } from '@/layouts/GuestLayout';

interface ResetPasswordProps {
  email: string;
  token: string;
}

export default function ResetPassword({ email, token }: ResetPasswordProps) {
  const form = useForm({
    token,
    email,
    password: '',
    password_confirmation: '',
  }).withPrecognition(resetPassword().method, resetPassword.url());

  const { data, setData, submit, processing, errors, hasErrors, validate } = form;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <>
      <Head title="新しいパスワードの設定" />
      <GuestLayout title="新しいパスワードの設定">
        <p className="-mt-4 mb-6 text-center text-muted-foreground text-sm leading-6">
          本人確認のためメールアドレスを確認し、新しいパスワードを入力してください。
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <InputField
              id="email"
              label="メールアドレス"
              type="email"
              value={data.email}
              placeholder="example@email.com"
              error={errors.email}
              onChange={(event) => setData('email', event.target.value)}
              onBlur={() => validate('email')}
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-6">
            <PasswordInput
              id="password"
              label="新しいパスワード"
              value={data.password}
              placeholder="新しいパスワード"
              error={errors.password}
              onChange={(event) => setData('password', event.target.value)}
              onBlur={() => validate('password')}
              autoComplete="new-password"
              required
            />
            <p className="mt-1 text-muted-foreground text-xs">
              8文字以上で、大文字・小文字・数字・記号を含めてください
            </p>
          </div>

          <div className="mb-6">
            <PasswordInput
              id="password_confirmation"
              label="新しいパスワード（確認用）"
              value={data.password_confirmation}
              placeholder="新しいパスワードを再入力"
              error={errors.password_confirmation}
              onChange={(event) => setData('password_confirmation', event.target.value)}
              onBlur={() => validate('password_confirmation')}
              autoComplete="new-password"
              required
            />
          </div>

          <PrimaryButton processing={processing} processingLabel="変更中..." disabled={hasErrors}>
            パスワードを変更する
          </PrimaryButton>

          <hr className="my-6 border-border" />

          <div className="text-center text-[13px] text-muted-foreground">
            <Link
              href={showLogin.url()}
              className="inline-flex min-h-11 items-center rounded-md px-3 py-2 transition-colors duration-motion-fast ease-standard hover:bg-accent hover:text-accent-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[loading]:opacity-70"
            >
              ログイン画面に戻る
            </Link>
          </div>
        </form>
      </GuestLayout>
    </>
  );
}
