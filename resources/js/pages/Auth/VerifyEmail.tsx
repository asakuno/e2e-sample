/**
 * メール認証待ちページ
 *
 * 登録後にメール認証を促すページコンポーネント。
 * GuestLayout でラップし、認証メール再送機能を提供する。
 */

import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { logout } from '@/actions/App/Http/Controllers/Web/AuthPageController';
import { send } from '@/actions/App/Http/Controllers/Web/EmailVerificationPageController';
import { VerifyEmailContent } from '@/components/features/auth/VerifyEmailContent';
import type { ActionCallback } from '@/components/ui/ActionScope';
import { inertiaAction, runInertiaAction } from '@/lib/inertia-actions';

interface VerifyEmailProps {
  status?: string;
}

export default function VerifyEmail({ status }: VerifyEmailProps) {
  const { post } = useForm({});
  const [cooldown, setCooldown] = useState(0);

  const resendVerificationEmail: ActionCallback = ({ transition }) => {
    return runInertiaAction((visitOptions) => {
      post(send.url(), {
        ...visitOptions,
        onSuccess: () => {
          transition(() => setCooldown(60));
        },
      });
    });
  };
  const logoutUser = inertiaAction((visitOptions) => {
    router.post(logout.url(), {}, visitOptions);
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
        onResend={resendVerificationEmail}
        onLogout={logoutUser}
      />
    </>
  );
}
