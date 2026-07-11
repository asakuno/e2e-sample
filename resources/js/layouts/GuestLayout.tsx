/**
 * ゲスト用レイアウトコンポーネント
 *
 * 未認証ユーザー向けのレイアウト。中央配置の認証用Surfaceを提供する。
 */
import type React from 'react';
import { Surface } from '@/components/ui/surface';

interface GuestLayoutProps {
  children: React.ReactNode;
  /** カードの見出しテキスト（デフォルト: ログイン） */
  title?: string;
}

export function GuestLayout({ children, title = 'ログイン' }: GuestLayoutProps) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6">
      <Surface asChild className="w-full max-w-[400px] p-8 sm:p-10">
        <main>
          <header className="mb-10 text-center">
            <p className="mb-2 font-semibold text-primary text-xs uppercase tracking-[0.18em]">
              Stock Insight
            </p>
            <h1 className="font-semibold text-2xl text-foreground tracking-tight">{title}</h1>
          </header>
          {children}
        </main>
      </Surface>
    </div>
  );
}
