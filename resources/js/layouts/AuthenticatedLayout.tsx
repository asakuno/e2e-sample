/**
 * 認証済みユーザー用レイアウト
 *
 * SideNav + TopNav + メインコンテンツ領域を構成する。
 */
import type React from 'react';
import { useState } from 'react';
import { MobileNavigationDrawer } from '@/components/layouts/MobileNavigationDrawer';
import { SideNav } from '@/components/layouts/SideNav';
import { TopNav } from '@/components/layouts/TopNav';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:flex focus:min-h-11 focus:items-center focus:rounded-lg focus:bg-primary focus:px-4 focus:text-primary-foreground focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        メインコンテンツへ移動
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <SideNav />
      </aside>

      <MobileNavigationDrawer open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
        <SideNav onNavigate={() => setMobileNavigationOpen(false)} />
      </MobileNavigationDrawer>

      <div className="flex min-h-dvh min-w-0 flex-col lg:pl-60">
        <TopNav
          navigationOpen={mobileNavigationOpen}
          onNavigationOpenChange={setMobileNavigationOpen}
        />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 sm:p-6">
          {children}
        </main>
        <footer className="border-border border-t bg-card px-4 py-3 sm:px-6">
          <p className="text-muted-foreground text-xs leading-5">
            本サービスは情報提供を目的とした株式分析アプリです。掲載情報は投資助言、売買推奨、将来の成果保証ではありません。
          </p>
        </footer>
      </div>
    </div>
  );
}
