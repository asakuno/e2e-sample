/**
 * ログインページ
 *
 * Inertia useForm によるフォーム管理・送信を行うページコンポーネント。
 * GuestLayout でラップし、メールアドレス・パスワード入力を提供する。
 */

import { Head, Link, useForm } from '@inertiajs/react';
import type React from 'react';
import { InputField } from '@/components/ui/InputField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GuestLayout } from '@/layouts/GuestLayout';

export default function Login() {
  const form = useForm({
    email: '',
    password: '',
  }).withPrecognition('post', '/login');

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
          <div className="mt-6 flex items-center justify-between text-[13px] text-slate-600">
            <span className="cursor-default text-slate-400">
              パスワードをお忘れですか？
            </span>
            <Link href="/register" className="transition hover:text-[#326CCB] hover:underline">
              新規登録はこちら
            </Link>
          </div>
        </form>
      </GuestLayout>
    </>
  );
}
