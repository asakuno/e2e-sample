/**
 * ゲスト用レイアウトコンポーネント
 *
 * 未認証ユーザー向けのレイアウト。背景グレー、中央配置の白カード。
 */
import type React from 'react';

interface GuestLayoutProps {
  children: React.ReactNode;
  /** カードの見出しテキスト（デフォルト: ログイン） */
  title?: string;
}

export function GuestLayout({ children, title = 'ログイン' }: GuestLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EEF2F6] p-4">
      <main className="w-full max-w-[400px] rounded-lg bg-white p-8 shadow-md sm:p-10">
        <header className="mb-12 text-center">
          <h1 className="font-bold text-2xl text-gray-800 tracking-wide">{title}</h1>
        </header>
        {children}
      </main>
    </div>
  );
}
