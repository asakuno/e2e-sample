/**
 * トップナビゲーションコンポーネント
 *
 * 検索バー、通知ベル、ユーザー情報、ログアウトボタンを表示。
 */
import { router, usePage } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import { logout } from '@/actions/App/Http/Controllers/Web/AuthPageController';
import type { AppPageProps } from '@/types/index.d.ts';
import { LogoutModal } from './LogoutModal';

export function TopNav() {
  const { props } = usePage<AppPageProps>();
  const userName = props.auth.user?.name ?? '';
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const logoutAction = useCallback(
    () =>
      new Promise<void>((resolve) => {
        router.post(
          logout.url(),
          {},
          {
            onError: () => resolve(),
            onFinish: () => resolve(),
          },
        );
      }),
    [],
  );

  return (
    <>
      <header className="flex h-16 items-center justify-between gap-4 border-gray-200 border-b bg-white px-6">
        {/* 検索バー */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="material-symbols-outlined text-gray-400">search</span>
          <input
            type="text"
            aria-label="銘柄・ニュース検索"
            placeholder="銘柄コード、企業名、ニュースを検索"
            className="w-full max-w-xl border-none bg-transparent text-gray-700 text-sm outline-none placeholder:text-gray-400 focus-visible:ring-0"
          />
        </div>

        {/* 右側: 通知・ユーザー情報 */}
        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden rounded-full bg-green-50 px-3 py-1 font-medium text-green-700 text-xs sm:inline">
            Market Open
          </span>

          {/* 通知ベル */}
          <button
            type="button"
            aria-label="アラート通知"
            className="relative min-h-11 min-w-11 rounded-md text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>

          {/* ユーザー名 */}
          <span className="font-medium text-gray-700 text-sm">{userName}</span>

          {/* ログアウト */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="min-h-11 rounded-md px-3 py-1.5 text-gray-600 text-sm transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
          >
            ログアウト
          </button>
        </div>
      </header>

      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        action={logoutAction}
      />
    </>
  );
}
