/**
 * ログインページ
 *
 * Inertia useForm によるフォーム管理・送信を行うページコンポーネント。
 * GuestLayout でラップし、メールアドレス・パスワード入力を提供する。
 */

import { Head, Link, useForm } from '@inertiajs/react';
import type React from 'react';
import { login, showRegister } from '@/actions/App/Http/Controllers/Web/AuthPageController';
import { showForgotPassword } from '@/actions/App/Http/Controllers/Web/PasswordResetPageController';
import { FeedbackMessage } from '@/components/ui/FlashMessages';
import { InputField } from '@/components/ui/InputField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GuestLayout } from '@/layouts/GuestLayout';

interface LoginProps {
  status?: string | null;
}

export default function Login({ status }: LoginProps) {
  const form = useForm({
    email: '',
    password: '',
  }).withPrecognition(login().method, login.url());

  const { data, setData, submit, processing, errors, validate } = form;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <>
      <Head title="ログイン" />
      <GuestLayout>
        <FeedbackMessage message={status} tone="success" className="mb-6" />

        <form onSubmit={handleSubmit}>
          {/* メールアドレス */}
          <div className="mb-6">
            <InputField
              id="email"
              label="メールアドレス"
              type="email"
              value={data.email}
              placeholder="example@email.com"
              error={errors.email}
              onChange={(e) => setData('email', e.target.value)}
              onBlur={() => validate('email')}
              autoComplete="email"
              required
            />
          </div>

          {/* パスワード */}
          <div className="mb-3">
            <PasswordInput
              id="password"
              label="パスワード"
              value={data.password}
              placeholder="••••••••••••"
              error={errors.password}
              onChange={(e) => setData('password', e.target.value)}
              onBlur={() => validate('password')}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="mb-6 flex justify-end text-[13px] text-muted-foreground">
            <Link
              href={showForgotPassword.url()}
              className="inline-flex min-h-11 items-center rounded-md px-3 py-2 transition-colors duration-motion-fast ease-standard hover:bg-accent hover:text-accent-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[loading]:opacity-70"
            >
              パスワードをお忘れですか？
            </Link>
          </div>

          {/* 送信ボタン */}
          <PrimaryButton processing={processing}>ログインする</PrimaryButton>

          {/* フッターリンク */}
          <div className="mt-6 flex justify-end text-[13px] text-muted-foreground">
            <Link
              href={showRegister.url()}
              className="inline-flex min-h-11 items-center rounded-md px-3 py-2 transition-colors duration-motion-fast ease-standard hover:bg-accent hover:text-accent-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[loading]:opacity-70"
            >
              新規登録はこちら
            </Link>
          </div>
        </form>
      </GuestLayout>
    </>
  );
}
