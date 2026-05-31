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
    <div className="flex h-screen bg-background-light text-gray-900">
      {/* サイドナビ */}
      <SideNav />

      {/* メインエリア */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-auto p-6">{children}</main>
        <footer className="border-gray-200 border-t bg-white px-6 py-3">
          <p className="text-gray-500 text-xs leading-5">
            本サービスは情報提供を目的とした株式分析アプリです。掲載情報は投資助言、売買推奨、将来の成果保証ではありません。
          </p>
        </footer>
      </div>
    </div>
  );
}
