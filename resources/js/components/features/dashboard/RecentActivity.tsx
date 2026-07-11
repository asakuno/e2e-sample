/**
 * 最近のアクティビティコンポーネント
 *
 * アクティビティ一覧をカード形式で表示する。
 */

import { ActivityItem } from '@/components/features/dashboard/ActivityItem';
import type { ActivityItemData } from '@/types/dashboard';

interface RecentActivityProps {
  activities?: ActivityItemData[];
  emptyMessage?: string;
  title?: string;
}

export function RecentActivity({
  activities = [],
  emptyMessage = '表示する項目はありません',
  title = '最近のアクティビティ',
}: RecentActivityProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground">
      <h3 className="mb-4 font-semibold text-base">{title}</h3>
      {activities.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} {...activity} />
          ))}
        </div>
      )}
    </div>
  );
}
