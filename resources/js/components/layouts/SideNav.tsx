/**
 * サイドナビゲーションコンポーネント
 *
 * アプリケーションのメインナビゲーション。ロゴ、ナビ項目、注意導線を表示。
 */
import { usePage } from '@inertiajs/react';
import { NavItem } from '@/components/layouts/NavItem';

/** ナビゲーション項目定義 */
const NAV_ITEMS = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/stocks', icon: 'query_stats', label: 'Stocks' },
  { href: '/watchlist', icon: 'visibility', label: 'Watchlist' },
  { href: '/news', icon: 'newspaper', label: 'News' },
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
        <div className="flex flex-col">
          <span className="font-bold text-gray-900 text-lg">Stock Insight</span>
          <span className="text-gray-500 text-xs">Market analysis app</span>
        </div>
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

      {/* 注意表示 */}
      <div className="border-gray-200 border-t px-4 py-4">
        <p className="font-medium text-gray-700 text-xs">注意</p>
        <p className="mt-1 text-gray-500 text-xs leading-5">
          表示内容は投資判断の参考情報であり、投資助言ではありません。
        </p>
      </div>
    </nav>
  );
}
