/**
 * ダッシュボードページ
 *
 * ログイン後のメイン画面。確認優先度の高い項目を起点に、
 * 全体の状況と分析推移を表示する。
 */
import { Head, usePage } from '@inertiajs/react';
import { DashboardPriorityFeed } from '@/components/features/dashboard/DashboardPriorityFeed';
import { StatCard } from '@/components/features/dashboard/StatCard';
import { TopStocksRanking } from '@/components/features/dashboard/TopStocksRanking';
import { TrendChart } from '@/components/features/dashboard/TrendChart';
import { WelcomeBanner } from '@/components/features/dashboard/WelcomeBanner';
import { presentDashboardPriorityFeed } from '@/components/features/dashboard/priority-feed-presentation';
import { presentDashboardStat } from '@/components/features/dashboard/stat-presentation';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import type { DashboardPageProps } from '@/types/dashboard';
import type { AppPageProps } from '@/types/index.d.ts';

export default function Dashboard({
  stats,
  recentTrend,
  topStocks,
  importantNews,
  latestAnalysisAt,
}: DashboardPageProps) {
  const { props } = usePage<AppPageProps>();
  const userName = props.auth.user?.name ?? '';
  const priorityItems = presentDashboardPriorityFeed(stats, importantNews, topStocks);
  const summaryStats = stats.filter((stat) => stat.kind !== 'latestAnalysis');

  return (
    <>
      <Head title="ダッシュボード" />
      <AuthenticatedLayout>
        <div className="flex flex-col gap-6">
          <WelcomeBanner userName={userName} latestAnalysisAt={latestAnalysisAt} />

          <div className="grid items-start gap-6 min-[90rem]:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
            <DashboardPriorityFeed items={priorityItems} />

            <aside className="flex min-w-0 flex-col gap-6" aria-label="ダッシュボードサマリー">
              <section aria-labelledby="dashboard-summary-heading">
                <h2
                  id="dashboard-summary-heading"
                  className="mb-3 font-semibold text-foreground text-lg"
                >
                  状況サマリー
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 min-[90rem]:grid-cols-2">
                  {summaryStats.map((stat) => (
                    <StatCard key={stat.kind} {...presentDashboardStat(stat)} />
                  ))}
                </div>
              </section>

              <section aria-labelledby="dashboard-ranking-heading">
                <h2 id="dashboard-ranking-heading" className="sr-only">
                  注目銘柄
                </h2>
                <TopStocksRanking stocks={topStocks} />
              </section>
            </aside>
          </div>

          <section aria-labelledby="dashboard-trend-heading">
            <h2 id="dashboard-trend-heading" className="mb-3 font-semibold text-foreground text-lg">
              分析推移
            </h2>
            <TrendChart {...recentTrend} />
          </section>
        </div>
      </AuthenticatedLayout>
    </>
  );
}
