/**
 * 認証済みユーザー用レイアウト
 *
 * SideNav + TopNav + メインコンテンツ領域を構成する。
 */
import type React from 'react';
import { SideNav } from '@/components/layouts/SideNav';
import { TopNav } from '@/components/layouts/TopNav';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="flex h-screen bg-background-light">
      {/* サイドナビ */}
      <SideNav />

      {/* メインエリア */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
