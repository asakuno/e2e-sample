/**
 * 統計カードコンポーネント
 *
 * ラベル、値、変化率、アイコンを表示する統計情報カード。
 */
import { cn } from '@/lib/utils';
import { AppIcon } from '@/components/ui/AppIcon';
import type { StatCardData } from '@/types/dashboard';

export function StatCard({
  label,
  value,
  subLabel,
  subValue,
  change,
  changeDirection,
  icon,
  iconColorClass,
}: StatCardData) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-gray-500 text-sm">{label}</p>
          <p className="mt-1 font-bold text-2xl text-gray-900">{value}</p>
          {subLabel != null && subValue != null && (
            <p className="mt-1 text-gray-400 text-xs">
              {subLabel}: {subValue}
            </p>
          )}
        </div>
        <AppIcon name={icon} className={cn('size-7', iconColorClass)} />
      </div>
      {change != null && changeDirection != null && (
        <p
          className={cn(
            'mt-3 font-medium text-sm',
            changeDirection === 'up' && 'text-green-600',
            changeDirection === 'down' && 'text-red-600',
            changeDirection === 'neutral' && 'text-gray-500',
          )}
        >
          {change}
        </p>
      )}
    </div>
  );
}
