import { Link } from '@inertiajs/react';
import { logout } from '@/actions/App/Http/Controllers/Web/AuthPageController';
import { ActionButton } from '@/components/ui/ActionButton';
import type { ActionCallback } from '@/components/ui/ActionScope';
import { GuestLayout } from '@/layouts/GuestLayout';

type VerifyEmailContentProps = {
  status: string | undefined;
  cooldown: number;
  onResend: ActionCallback;
};

export function VerifyEmailContent({ status, cooldown, onResend }: VerifyEmailContentProps) {
  return (
    <GuestLayout title="メール認証">
      {/* メールアイコン */}
      <div className="-mt-6 mb-4 flex justify-center">
        <svg
          className="h-12 w-12 text-muted-foreground"
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

      <p className="-mt-2 mb-6 text-center text-muted-foreground text-sm">
        登録いただいたメールアドレスに認証リンクを送信しました。
        メール内のリンクをクリックして認証を完了してください。
      </p>

      {status === 'verification-link-sent' && (
        <div
          role="status"
          className="mb-6 rounded-md bg-positive-muted p-3 text-center text-positive text-sm"
        >
          認証リンクを再送しました。
        </div>
      )}

      <ActionButton
        action={onResend}
        disabled={cooldown > 0}
        pendingLabel="送信中..."
        className="h-auto w-full rounded bg-primary px-4 py-3 font-bold text-base text-primary-foreground tabular-nums shadow-md transition-colors duration-motion-normal ease-standard hover:bg-primary/90"
      >
        {cooldown > 0 ? `再送可能まで ${cooldown}秒` : '認証メールを再送する'}
      </ActionButton>

      <hr className="my-6 border-border" />

      <div className="text-center text-[13px] text-muted-foreground">
        <Link
          href={logout.url()}
          method={logout().method}
          as="button"
          className="inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 transition-colors duration-motion-fast ease-standard hover:bg-accent hover:text-accent-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          ログアウト
        </Link>
      </div>
    </GuestLayout>
  );
}
