/**
 * サイドナビゲーションコンポーネント
 *
 * アプリケーションのメインナビゲーション。ロゴ、ナビ項目、注意導線を表示。
 */
import { usePage } from '@inertiajs/react';
import { NavItem } from '@/components/layouts/NavItem';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { dashboard } from '@/routes';
import { index as analysisIndex } from '@/routes/analysis';
import { index as newsIndex } from '@/routes/news';
import { index as stocksIndex } from '@/routes/stocks';
import { index as watchlistIndex } from '@/routes/watchlist';

/** ナビゲーション項目定義 */
const NAV_ITEMS = [
  { href: dashboard.url(), icon: 'dashboard', label: 'Dashboard' },
  { href: stocksIndex.url(), icon: 'query_stats', label: 'Stocks' },
  { href: watchlistIndex.url(), icon: 'visibility', label: 'Watchlist' },
  { href: newsIndex.url(), icon: 'newspaper', label: 'News' },
  { href: analysisIndex.url(), icon: 'psychology', label: 'Analysis' },
] as const;

type SideNavProps = {
  onNavigate?: () => void;
};

export function SideNav({ onNavigate }: SideNavProps) {
  const { url } = usePage();

  return <SideNavView currentUrl={url} {...(onNavigate ? { onNavigate } : {})} />;
}

type SideNavViewProps = {
  currentUrl: string;
  onNavigate?: () => void;
};

export function SideNavView({ currentUrl, onNavigate }: SideNavViewProps) {
  return (
    <nav
      aria-label="メインナビゲーション"
      className="flex h-full w-full flex-col overflow-y-auto overscroll-contain border-sidebar-border border-r bg-sidebar text-sidebar-foreground"
    >
      <div className="flex min-h-16 items-center px-6">
        <InertiaActionLink
          href={dashboard.url()}
          aria-label="Stock Insight ホーム"
          onClick={() => onNavigate?.()}
          pendingClassName="opacity-70"
          className="flex min-h-11 flex-col justify-center rounded-lg pr-10 transition-opacity duration-motion-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
        >
          <span className="font-bold text-lg leading-6">Stock Insight</span>
          <span className="text-sidebar-foreground/70 text-xs leading-4">Market analysis app</span>
        </InertiaActionLink>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isCurrentRoute(currentUrl, item.href)}
            {...(onNavigate ? { onNavigate } : {})}
          />
        ))}
      </div>

      <div className="border-sidebar-border border-t px-4 py-4">
        <p className="font-medium text-xs">注意</p>
        <p className="mt-1 text-sidebar-foreground/70 text-xs leading-5">
          表示内容は投資判断の参考情報であり、投資助言ではありません。
        </p>
      </div>
    </nav>
  );
}

function isCurrentRoute(currentUrl: string, href: string) {
  const pathname = currentUrl.split(/[?#]/, 1)[0] ?? currentUrl;

  return pathname === href || pathname.startsWith(`${href}/`);
}
