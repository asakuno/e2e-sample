/**
 * サイドナビゲーションコンポーネント
 *
 * アプリケーションのメインナビゲーション。ロゴ、ナビ項目、ヘルプリンクを表示。
 */
import { usePage } from '@inertiajs/react';
import { NavItem } from '@/components/layouts/NavItem';

/** ナビゲーション項目定義 */
const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'ダッシュボード' },
  { href: '/projects', icon: 'folder', label: 'プロジェクト' },
  { href: '/members', icon: 'group', label: 'メンバー' },
  { href: '/settings', icon: 'settings', label: '設定' },
] as const;

export function SideNav() {
  const { url } = usePage();

  return (
    <nav
      aria-label="メインナビゲーション"
      className="flex h-full w-60 flex-col border-gray-200 border-r bg-white"
    >
      {/* ロゴ */}
      <div className="flex h-16 items-center px-6">
        <span className="font-bold text-gray-900 text-lg">Web App</span>
      </div>

      {/* ナビゲーション項目 */}
      <div className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={url.startsWith(item.href)}
          />
        ))}
      </div>

      {/* ヘルプリンク */}
      <div className="border-gray-200 border-t px-3 py-3">
        <NavItem href="/help" icon="help" label="ヘルプ＆サポート" />
      </div>
    </nav>
  );
}
