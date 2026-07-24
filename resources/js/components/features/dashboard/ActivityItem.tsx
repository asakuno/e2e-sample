/**
 * アクティビティアイテムコンポーネント
 *
 * 個別のアクティビティ項目を色付きドット付きで表示する。
 */
import { cn } from '@/lib/utils';
import { formatJstDateTime } from '@/lib/formatters';
import type { ActivityItemData } from '@/types/dashboard';

/** ドットカラーのクラスマッピング */
const DOT_COLOR_MAP: Record<ActivityItemData['dotColor'], string> = {
  blue: 'bg-info',
  green: 'bg-positive',
  orange: 'bg-warning',
  gray: 'bg-muted-foreground',
};

export function ActivityItem({ title, description, timeAgo, dotColor }: ActivityItemData) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1.5">
        <span className={cn('h-2.5 w-2.5 rounded-full', DOT_COLOR_MAP[dotColor])} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground text-sm">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
        <time
          dateTime={timeAgo}
          className="mt-0.5 block text-muted-foreground text-xs tabular-nums"
        >
          {formatJstDateTime(timeAgo)}
        </time>
      </div>
    </div>
  );
}
