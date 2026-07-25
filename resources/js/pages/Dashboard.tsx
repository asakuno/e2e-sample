/**
 * ダッシュボードページ
 *
 * ログイン後のメイン画面。現在の確認候補を起点に、
 * 全体の状況と分析推移を表示する。
 */
import { Deferred, Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { DashboardPriorityFeed } from '@/components/features/dashboard/DashboardPriorityFeed';
import { StatCard } from '@/components/features/dashboard/StatCard';
import { TopStocksRanking } from '@/components/features/dashboard/TopStocksRanking';
import { TrendChart } from '@/components/features/dashboard/TrendChart';
import { WelcomeBanner } from '@/components/features/dashboard/WelcomeBanner';
import { presentDashboardPriorityFeed } from '@/components/features/dashboard/priority-feed-presentation';
import { presentDashboardStat } from '@/components/features/dashboard/stat-presentation';
import { type InertiaPageComponent, withAuthenticatedLayout } from '@/layouts/page-layouts';
import type { DashboardDetails, DashboardPageProps } from '@/types/dashboard';
import type { AppPageProps } from '@/types/index.d.ts';

function DeferredFallback({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

function PriorityFeedSkeleton() {
  return (
    <DeferredFallback label="確認候補を読み込み中">
      <div className="min-h-72 animate-pulse rounded-lg border border-border bg-card p-5">
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="mt-5 space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-16 rounded bg-muted" />
          ))}
        </div>
      </div>
    </DeferredFallback>
  );
}

function RankingSkeleton() {
  return (
    <DeferredFallback label="注目銘柄を読み込み中">
      <div className="min-h-72 animate-pulse rounded-lg border border-border bg-card p-5">
        <div className="h-6 w-28 rounded bg-muted" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-10 rounded bg-muted" />
          ))}
        </div>
      </div>
    </DeferredFallback>
  );
}

function TrendSkeleton() {
  return (
    <DeferredFallback label="分析推移を読み込み中">
      <div className="h-72 animate-pulse rounded-lg border border-border bg-card p-5">
        <div className="h-full rounded bg-muted" />
      </div>
    </DeferredFallback>
  );
}

const Dashboard: InertiaPageComponent<DashboardPageProps> = ({
  stats,
  latestAnalysisAt,
  dashboardDetails,
}) => {
  const { props } = usePage<AppPageProps>();
  const userName = props.auth.user?.name ?? '';
  const summaryStats = stats.filter((stat) => stat.kind !== 'latestAnalysis');

  const renderPriorityFeed = (details: DashboardDetails) => (
    <DashboardPriorityFeed
      items={presentDashboardPriorityFeed(stats, details.importantNews, details.attentionStocks)}
    />
  );

  return (
    <>
      <Head title="ダッシュボード" />
      <div className="flex flex-col gap-6">
        <WelcomeBanner userName={userName} latestAnalysisAt={latestAnalysisAt} />

        <div className="grid items-start gap-6 min-[90rem]:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
          <Deferred data="dashboardDetails" fallback={<PriorityFeedSkeleton />}>
            {dashboardDetails ? renderPriorityFeed(dashboardDetails) : null}
          </Deferred>

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
              <Deferred data="dashboardDetails" fallback={<RankingSkeleton />}>
                {dashboardDetails ? <TopStocksRanking stocks={dashboardDetails.topStocks} /> : null}
              </Deferred>
            </section>
          </aside>
        </div>

        <section aria-labelledby="dashboard-trend-heading">
          <h2 id="dashboard-trend-heading" className="mb-3 font-semibold text-foreground text-lg">
            分析推移
          </h2>
          <Deferred data="dashboardDetails" fallback={<TrendSkeleton />}>
            {dashboardDetails ? <TrendChart {...dashboardDetails.recentTrend} /> : null}
          </Deferred>
        </section>
      </div>
    </>
  );
};

Dashboard.layout = withAuthenticatedLayout;

export default Dashboard;
