/**
 * サイドナビゲーション項目コンポーネント
 *
 * アイコン + ラベルのリンク。active 状態でハイライト表示。
 */
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  icon: AppIconName;
  label: string;
  active?: boolean;
  onNavigate?: () => void;
}

export function NavItem({ href, icon, label, active = false, onNavigate }: NavItemProps) {
  return (
    <InertiaActionLink
      href={href}
      aria-current={active ? 'page' : undefined}
      onClick={() => onNavigate?.()}
      pendingClassName="opacity-70"
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-[background-color,color,transform] duration-motion-fast active:translate-y-px motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <AppIcon name={icon} className="size-5" />
      {label}
    </InertiaActionLink>
  );
}
