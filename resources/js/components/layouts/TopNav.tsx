/**
 * トップナビゲーションコンポーネント
 *
 * モバイルメニュー、ユーザー情報、ログアウトボタンを表示。
 */
import { router, usePage } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { logout } from '@/actions/App/Http/Controllers/Web/AuthPageController';
import { inertiaAction } from '@/lib/inertia-actions';
import type { AppPageProps } from '@/types/index.d.ts';
import { AppIcon } from '@/components/ui/AppIcon';
import { LogoutModal } from './LogoutModal';

type TopNavProps = {
  navigationOpen: boolean;
  onNavigationOpenChange: (open: boolean) => void;
};

export function TopNav({ navigationOpen, onNavigationOpenChange }: TopNavProps) {
  const { props } = usePage<AppPageProps>();
  const userName = props.auth.user?.name ?? '';
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const logoutAction = inertiaAction((visitOptions) => {
    router.post(logout.url(), {}, visitOptions);
  });

  return (
    <TopNavView
      userName={userName}
      navigationOpen={navigationOpen}
      logoutOpen={showLogoutModal}
      onNavigationOpenChange={onNavigationOpenChange}
      onOpenLogout={() => setShowLogoutModal(true)}
      onCloseLogout={() => setShowLogoutModal(false)}
      onLogout={logoutAction}
    />
  );
}

type TopNavViewProps = {
  userName: string;
  navigationOpen: boolean;
  logoutOpen: boolean;
  onNavigationOpenChange: (open: boolean) => void;
  onOpenLogout: () => void;
  onCloseLogout: () => void;
  onLogout: () => Promise<void>;
};

export function TopNavView({
  userName,
  navigationOpen,
  logoutOpen,
  onNavigationOpenChange,
  onOpenLogout,
  onCloseLogout,
  onLogout,
}: TopNavViewProps) {
  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-border border-b bg-background px-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            aria-label={navigationOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={navigationOpen}
            aria-controls="mobile-navigation"
            onClick={() => onNavigationOpenChange(!navigationOpen)}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-[background-color,color,transform] duration-motion-fast hover:bg-accent hover:text-accent-foreground active:translate-y-px motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>
          <span className="truncate font-semibold text-sm lg:hidden">Stock Insight</span>
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden max-w-48 truncate font-medium text-muted-foreground text-sm sm:inline">
            {userName}
          </span>
          <button
            type="button"
            aria-label="ログアウト"
            onClick={onOpenLogout}
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 font-medium text-muted-foreground text-sm transition-[background-color,color,transform] duration-motion-fast hover:bg-accent hover:text-accent-foreground active:translate-y-px motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <AppIcon name="logout" className="size-5" />
            <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>
      </header>

      <LogoutModal open={logoutOpen} onClose={onCloseLogout} action={onLogout} />
    </>
  );
}
