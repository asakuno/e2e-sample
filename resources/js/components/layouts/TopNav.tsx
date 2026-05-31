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
      <header className="flex h-16 items-center justify-between border-gray-200 border-b bg-white px-6">
        {/* 検索バー */}
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-400">search</span>
          <input
            type="text"
            placeholder="検索..."
            className="border-none bg-transparent text-gray-700 text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        {/* 右側: 通知・ユーザー情報 */}
        <div className="flex items-center gap-4">
          {/* 通知ベル */}
          <button
            type="button"
            aria-label="通知"
            className="relative text-gray-500 hover:text-gray-700"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>

          {/* ユーザー名 */}
          <span className="font-medium text-gray-700 text-sm">{userName}</span>

          {/* ログアウト */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="rounded-md px-3 py-1.5 text-gray-600 text-sm transition hover:bg-gray-100 hover:text-gray-900"
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
