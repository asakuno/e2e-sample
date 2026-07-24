import { Head, router } from '@inertiajs/react';
import { StockAnalysisList } from '@/components/features/stock/StockAnalysisList';
import { StockDetailContent } from '@/components/features/stock/StockDetailContent';
import { StockInsightsPanel } from '@/components/features/stock/StockInsightsPanel';
import { PeriodAnalysisCard } from '@/components/features/stock/PeriodAnalysisCard';
import { StockRelatedNewsList } from '@/components/features/stock/StockRelatedNewsList';
import { StockWatchlistControl } from '@/components/features/stock/StockWatchlistControl';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { runInertiaAction } from '@/lib/inertia-actions';
import { store as storeWatchlist } from '@/routes/watchlist';
import type { StockDetailPageProps } from '@/types/stocks';

export default function StockDetail({ stock }: StockDetailPageProps) {
  const handleAddToWatchlist = (): Promise<void> => {
    return runInertiaAction(
      (visitOptions) => {
        router.post(
          storeWatchlist.url(),
          {
            stock_id: stock.id,
            memo: '',
            priority: 2,
          },
          visitOptions,
        );
      },
      { preserveScroll: true },
    );
  };

  return (
    <>
      <Head title={`${stock.symbol} - Stocks`} />
      <AuthenticatedLayout>
        <StockDetailContent
          stock={stock}
          watchlistControl={
            <StockWatchlistControl stock={stock} addAction={handleAddToWatchlist} />
          }
        >
          <StockInsightsPanel
            periodAnalysis={
              <PeriodAnalysisCard
                analysis={stock.latest_period_analysis}
                signal={stock.period_signal}
              />
            }
            relatedNews={<StockRelatedNewsList articles={stock.related_news} />}
            analyses={<StockAnalysisList analyses={stock.analyses} articles={stock.related_news} />}
            signals={stock.signals}
          />
        </StockDetailContent>
      </AuthenticatedLayout>
    </>
  );
}
