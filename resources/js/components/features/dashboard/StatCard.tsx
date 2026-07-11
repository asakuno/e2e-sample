/**
 * 統計カードコンポーネント
 *
 * ラベル、値、変化率、アイコンを表示する統計情報カード。
 */
import { cn } from '@/lib/utils';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';

export interface StatCardData {
  label: string;
  value: string;
  subLabel?: string;
  subValue?: string;
  change?: string;
  changeTone?: 'positive' | 'negative' | 'neutral';
  changeAccessibleLabel?: string;
  icon: AppIconName;
  iconColorClass: string;
}

export function StatCard({
  label,
  value,
  subLabel,
  subValue,
  change,
  changeTone = 'neutral',
  changeAccessibleLabel,
  icon,
  iconColorClass,
}: StatCardData) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="mt-1 font-bold text-2xl tabular-nums">{value}</p>
          {subLabel != null && subValue != null && (
            <p className="mt-1 text-muted-foreground text-xs tabular-nums">
              {subLabel}: {subValue}
            </p>
          )}
        </div>
        <AppIcon name={icon} className={cn('size-7', iconColorClass)} />
      </div>
      {change != null && (
        <p
          aria-label={changeAccessibleLabel}
          className={cn(
            'mt-3 font-medium text-sm tabular-nums',
            changeTone === 'positive' && 'text-positive',
            changeTone === 'negative' && 'text-negative',
            changeTone === 'neutral' && 'text-muted-foreground',
          )}
        >
          {change}
        </p>
      )}
    </div>
  );
}
