/**
 * ログインページ
 *
 * Inertia useForm によるフォーム管理・送信を行うページコンポーネント。
 * GuestLayout でラップし、メールアドレス・パスワード入力を提供する。
 */

import { Head, useForm } from '@inertiajs/react';
import type React from 'react';
import { login, showRegister } from '@/actions/App/Http/Controllers/Web/AuthPageController';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { InputField } from '@/components/ui/InputField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GuestLayout } from '@/layouts/GuestLayout';

export default function Login() {
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
          <div className="mb-8">
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

          {/* 送信ボタン */}
          <PrimaryButton processing={processing}>ログインする</PrimaryButton>

          {/* フッターリンク */}
          <div className="mt-6 flex justify-end text-[13px] text-muted-foreground">
            <InertiaActionLink
              href={showRegister.url()}
              pendingClassName="opacity-70"
              className="inline-flex min-h-11 items-center rounded-md px-3 py-2 transition-colors duration-motion-fast ease-standard hover:bg-accent hover:text-accent-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              新規登録はこちら
            </InertiaActionLink>
          </div>
        </form>
      </GuestLayout>
    </>
  );
}
