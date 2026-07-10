/**
 * メール認証待ちページ
 *
 * 登録後にメール認証を促すページコンポーネント。
 * GuestLayout でラップし、認証メール再送機能を提供する。
 */

import { Head, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { send } from '@/actions/App/Http/Controllers/Web/EmailVerificationPageController';
import { VerifyEmailContent } from '@/components/features/auth/VerifyEmailContent';

interface VerifyEmailProps {
  status?: string;
}

export default function VerifyEmail({ status }: VerifyEmailProps) {
  const { post, processing } = useForm({});
  const [cooldown, setCooldown] = useState(0);

  const resendVerificationEmail = () => {
    post(send.url(), {
      onSuccess: () => setCooldown(60),
    });
  };

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
