import { Head, Link, useForm } from '@inertiajs/react';
import type React from 'react';
import { showLogin } from '@/actions/App/Http/Controllers/Web/AuthPageController';
import { sendPasswordResetLink } from '@/actions/App/Http/Controllers/Web/PasswordResetPageController';
import { FeedbackMessage } from '@/components/ui/FlashMessages';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GuestLayout } from '@/layouts/GuestLayout';

interface ForgotPasswordProps {
  status?: string | null;
}

export default function ForgotPassword({ status }: ForgotPasswordProps) {
  const form = useForm({
    email: '',
  }).withPrecognition(sendPasswordResetLink().method, sendPasswordResetLink.url());

  const { data, setData, submit, processing, errors, hasErrors, validate } = form;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <>
      <Head title="パスワード再設定" />
      <GuestLayout title="パスワード再設定">
        <p className="-mt-4 mb-6 text-center text-muted-foreground text-sm leading-6">
          ご登録のメールアドレスへ、パスワード再設定用のリンクを送信します。
        </p>

        <FeedbackMessage message={status} tone="success" className="mb-6" />

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

          <PrimaryButton processing={processing} processingLabel="送信中..." disabled={hasErrors}>
            再設定リンクを送信する
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
