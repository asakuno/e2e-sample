/**
 * ダッシュボードページ
 *
 * ログイン後のメイン画面。現在の確認候補を起点に、
 * 全体の状況と分析推移を表示する。
 */
import { Deferred, Head, router, usePage } from '@inertiajs/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { DashboardPriorityFeed } from '@/components/features/dashboard/DashboardPriorityFeed';
import { StatCard } from '@/components/features/dashboard/StatCard';
import { TopStocksRanking } from '@/components/features/dashboard/TopStocksRanking';
import { TrendChart } from '@/components/features/dashboard/TrendChart';
import { WelcomeBanner } from '@/components/features/dashboard/WelcomeBanner';
import { presentDashboardPriorityFeed } from '@/components/features/dashboard/priority-feed-presentation';
import { presentDashboardStat } from '@/components/features/dashboard/stat-presentation';
import { Button } from '@/components/ui/button';
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

function useDashboardDetailsFailure(dashboardDetails: DashboardDetails | undefined) {
  const [failed, setFailed] = useState(false);
  const detailsVisitActive = useRef(false);

  useEffect(() => {
    const stopStartListener = router.on('start', (event) => {
      if (!event.detail.visit.only.includes('dashboardDetails')) {
        return;
      }

      detailsVisitActive.current = true;
      setFailed(false);
    });
    const stopFinishListener = router.on('finish', (event) => {
      if (!detailsVisitActive.current || !event.detail.visit.only.includes('dashboardDetails')) {
        return;
      }

      detailsVisitActive.current = false;
      if (!event.detail.visit.completed) {
        setFailed(true);
      }
    });
    const markActiveVisitAsFailed = () => {
      if (!detailsVisitActive.current) {
        return;
      }

      detailsVisitActive.current = false;
      setFailed(true);
    };
    const stopInvalidListener = router.on('invalid', markActiveVisitAsFailed);
    const stopExceptionListener = router.on('exception', markActiveVisitAsFailed);

    return () => {
      stopStartListener();
      stopFinishListener();
      stopInvalidListener();
      stopExceptionListener();
    };
  }, []);

  useEffect(() => {
    if (dashboardDetails !== undefined) {
      detailsVisitActive.current = false;
      setFailed(false);
    }
  }, [dashboardDetails]);

  return {
    failed,
    retry: () => router.reload({ only: ['dashboardDetails'] }),
  };
}

function DashboardDetailsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center"
    >
      <p className="font-medium text-foreground">詳細データを取得できませんでした</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        再試行
      </Button>
    </div>
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
  const detailsFailure = useDashboardDetailsFailure(dashboardDetails);

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

        {detailsFailure.failed && <DashboardDetailsError onRetry={detailsFailure.retry} />}

        <div className="grid items-start gap-6 min-[90rem]:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
          <Deferred
            data="dashboardDetails"
            fallback={detailsFailure.failed ? null : <PriorityFeedSkeleton />}
          >
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
              <Deferred
                data="dashboardDetails"
                fallback={detailsFailure.failed ? null : <RankingSkeleton />}
              >
                {dashboardDetails ? <TopStocksRanking stocks={dashboardDetails.topStocks} /> : null}
              </Deferred>
            </section>
          </aside>
        </div>

        <section aria-labelledby="dashboard-trend-heading">
          <h2 id="dashboard-trend-heading" className="mb-3 font-semibold text-foreground text-lg">
            分析推移
          </h2>
          <Deferred
            data="dashboardDetails"
            fallback={detailsFailure.failed ? null : <TrendSkeleton />}
          >
            {dashboardDetails ? <TrendChart {...dashboardDetails.recentTrend} /> : null}
          </Deferred>
        </section>
      </div>
    </>
  );
};

Dashboard.layout = withAuthenticatedLayout;

export default Dashboard;
