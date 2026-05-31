/**
 * 最近のアクティビティコンポーネント
 *
 * アクティビティ一覧をカード形式で表示する。
 */

import { ActivityItem } from '@/components/features/dashboard/ActivityItem';
import type { ActivityItemData } from '@/types/dashboard';

interface RecentActivityProps {
  activities: ActivityItemData[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 font-semibold text-base text-gray-900">
        最近のアクティビティ
      </h3>
      <div className="flex flex-col gap-4">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} {...activity} />
        ))}
      </div>
    </div>
  );
}
