/**
 * ユーザー新規登録ページ
 *
 * Inertia useForm によるフォーム管理・送信を行うページコンポーネント。
 * GuestLayout でラップし、名前・メール・パスワード入力を提供する。
 */

import { Head, useForm } from '@inertiajs/react';
import type React from 'react';
import { useState, useTransition } from 'react';
import { register, showLogin } from '@/actions/App/Http/Controllers/Web/AuthPageController';
import { InputField } from '@/components/ui/InputField';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GuestLayout } from '@/layouts/GuestLayout';
import { ActionLink } from '@/components/ui/ActionLink';
import { visitAction } from '@/lib/inertia-actions';

export default function Register() {
  const [isPending, startTransition] = useTransition();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmationVisible, setPasswordConfirmationVisible] = useState(false);
  const form = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  }).withPrecognition(register().method, register.url());

  const { data, setData, submit, processing, errors, validate } = form;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      submit();
    });
  };

  return (
    <>
      <Head title="新規会員登録" />
      <GuestLayout title="新規会員登録">
        {/* サブタイトル */}
        <p className="-mt-8 mb-8 text-center text-slate-500 text-sm">
          アカウントを作成してサービスを開始しましょう
        </p>

        <form onSubmit={handleSubmit}>
          {/* お名前 */}
          <div className="mb-6">
            <InputField
              id="name"
              label="お名前"
              type="text"
              value={data.name}
              placeholder="田中 太郎"
              error={errors.name}
              onChange={(e) => setData('name', e.target.value)}
              onBlur={() => validate('name')}
              autoComplete="name"
              required
            />
          </div>

          {/* メールアドレス */}
          <div className="mb-6">
            <InputField
              id="email"
              label="メールアドレス"
              type="email"
              value={data.email}
              placeholder="example@mail.com"
              error={errors.email}
              onChange={(e) => setData('email', e.target.value)}
              onBlur={() => validate('email')}
              autoComplete="email"
              required
            />
          </div>

          {/* パスワード */}
          <div className="mb-6">
            <PasswordInput
              id="password"
              label="パスワード"
              value={data.password}
              visible={passwordVisible}
              placeholder="8文字以上の英数字"
              error={errors.password}
              onChange={(e) => setData('password', e.target.value)}
              onVisibleChange={setPasswordVisible}
              onBlur={() => validate('password')}
              autoComplete="new-password"
              required
            />
            <p className="mt-1 text-xs text-slate-400">8文字以上の英数字を含めてください</p>
          </div>

          {/* パスワード（確認用） */}
          <div className="mb-6">
            <PasswordInput
              id="password_confirmation"
              label="パスワード（確認用）"
              value={data.password_confirmation}
              visible={passwordConfirmationVisible}
              placeholder="パスワードを再入力"
              error={errors.password_confirmation}
              onChange={(e) => setData('password_confirmation', e.target.value)}
              onVisibleChange={setPasswordConfirmationVisible}
              onBlur={() => validate('password_confirmation')}
              autoComplete="new-password"
              required
            />
          </div>

          {/* 利用規約同意テキスト */}
          <p className="mb-6 text-center text-slate-500 text-xs">
            「アカウントを作成する」をクリックすることで、弊社の
            <span className="font-medium text-slate-700">利用規約</span>
            および
            <span className="font-medium text-slate-700">プライバシーポリシー</span>
            に同意したものとみなされます。
          </p>

          {/* 送信ボタン */}
          <PrimaryButton processing={processing || isPending}>アカウントを作成する</PrimaryButton>

          {/* 区切り線 */}
          <hr className="my-6 border-slate-200" />

          {/* フッターリンク */}
          <div className="text-center text-[13px] text-slate-600">
            <ActionLink
              href={showLogin.url()}
              action={visitAction(showLogin.url())}
              pendingClassName="opacity-70"
              className="transition hover:text-[#326CCB] hover:underline"
            >
              既にアカウントをお持ちの方はこちら &rarr;
            </ActionLink>
          </div>
        </form>
      </GuestLayout>
    </>
  );
}
