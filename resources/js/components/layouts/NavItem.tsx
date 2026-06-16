/**
 * サイドナビゲーション項目コンポーネント
 *
 * アイコン + ラベルのリンク。active 状態でハイライト表示。
 */
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/AppIcon';

interface NavItemProps {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}

export function NavItem({ href, icon, label, active = false }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-[background-color,color,transform] active:translate-y-px focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2',
        active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
      )}
    >
      <AppIcon name={icon} className="size-5" />
      {label}
    </Link>
  );
}
