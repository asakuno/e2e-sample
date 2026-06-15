/**
 * メール認証待ちページ
 *
 * 登録後にメール認証を促すページコンポーネント。
 * GuestLayout でラップし、認証メール再送機能を提供する。
 */

import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { logout } from '@/actions/App/Http/Controllers/Web/AuthPageController';
import { send } from '@/actions/App/Http/Controllers/Web/EmailVerificationPageController';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { GuestLayout } from '@/layouts/GuestLayout';

interface VerifyEmailProps {
  status?: string;
}

export default function VerifyEmail({ status }: VerifyEmailProps) {
  const { post, processing } = useForm({});
  const [cooldown, setCooldown] = useState(0);

  const resendVerificationEmail = () =>
    new Promise<void>((resolve) => {
      post(send.url(), {
        onSuccess: () => setCooldown(60),
        onFinish: () => resolve(),
      });
    });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return (
    <>
      <Head title="メール認証" />
      <VerifyEmailContent
        status={status}
        cooldown={cooldown}
        processing={processing}
        onResend={resendVerificationEmail}
      />
    </>
  );
}

type VerifyEmailContentProps = {
  status: string | undefined;
  cooldown: number;
  processing: boolean;
  onResend: () => void | Promise<void>;
};

export function VerifyEmailContent({
  status,
  cooldown,
  processing,
  onResend,
}: VerifyEmailContentProps) {
  return (
    <GuestLayout title="メール認証">
      {/* メールアイコン */}
      <div className="-mt-6 mb-4 flex justify-center">
        <svg
          className="h-12 w-12 text-slate-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
          />
        </svg>
      </div>

      <p className="-mt-2 mb-6 text-center text-slate-500 text-sm">
        登録いただいたメールアドレスに認証リンクを送信しました。
        メール内のリンクをクリックして認証を完了してください。
      </p>

      {status === 'verification-link-sent' && (
        <div
          role="status"
          className="mb-6 rounded-md bg-green-50 p-3 text-center text-green-700 text-sm"
        >
          認証リンクを再送しました。
        </div>
      )}

      <PrimaryButton
        action={onResend}
        processing={processing}
        disabled={cooldown > 0}
        processingLabel="送信中..."
      >
        {cooldown > 0 ? `再送可能まで ${cooldown}秒` : '認証メールを再送する'}
      </PrimaryButton>

      <hr className="my-6 border-slate-200" />

      <div className="text-center text-[13px] text-slate-600">
        <Link
          href={logout.url()}
          method={logout().method}
          as="button"
          className="transition hover:text-[#326CCB] hover:underline"
        >
          ログアウト
        </Link>
      </div>
    </GuestLayout>
  );
}
