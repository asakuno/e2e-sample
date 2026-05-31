/**
 * アクティビティアイテムコンポーネント
 *
 * 個別のアクティビティ項目を色付きドット付きで表示する。
 */
import { cn } from '@/lib/utils';
import type { ActivityItemData } from '@/types/dashboard';

/** ドットカラーのクラスマッピング */
const DOT_COLOR_MAP: Record<ActivityItemData['dotColor'], string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-400',
};

export function ActivityItem({ title, description, timeAgo, dotColor }: ActivityItemData) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-1.5">
        <span className={cn('h-2.5 w-2.5 rounded-full', DOT_COLOR_MAP[dotColor])} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900 text-sm">{title}</p>
        <p className="text-gray-500 text-sm">{description}</p>
        <p className="mt-0.5 text-gray-400 text-xs">{timeAgo}</p>
      </div>
    </div>
  );
}
