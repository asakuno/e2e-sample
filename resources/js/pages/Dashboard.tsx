/**
 * ダッシュボードページ
 *
 * ログイン後のメイン画面。ウェルカムバナー、統計カード、
 * トレンドチャート、最近のアクティビティを表示する。
 */
import { Head, usePage } from '@inertiajs/react';
import { RecentActivity } from '@/components/features/dashboard/RecentActivity';
import { StatCard } from '@/components/features/dashboard/StatCard';
import { TrendChart } from '@/components/features/dashboard/TrendChart';
import { WelcomeBanner } from '@/components/features/dashboard/WelcomeBanner';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import type { DashboardPageProps } from '@/types/dashboard';
import type { AppPageProps } from '@/types/index.d.ts';

export default function Dashboard({ stats, recentTrend, recentActivities }: DashboardPageProps) {
  const { props } = usePage<AppPageProps>();
  const userName = props.auth.user?.name ?? '';

  return (
    <>
      <Head title="ダッシュボード" />
      <AuthenticatedLayout>
        <div className="flex flex-col gap-6">
          {/* ウェルカムバナー */}
          <WelcomeBanner userName={userName} />

          {/* 統計カード */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          {/* トレンドチャート + 最近のアクティビティ */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TrendChart {...recentTrend} />
            <RecentActivity activities={recentActivities} />
          </div>
        </div>
      </AuthenticatedLayout>
    </>
  );
}
