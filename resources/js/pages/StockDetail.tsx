import { Head } from '@inertiajs/react';
import { NewsAnalysisList } from '@/components/features/news/NewsAnalysisList';
import { RelatedNewsList } from '@/components/features/news/RelatedNewsList';
import { StockDetailContent } from '@/components/features/stock/StockDetailContent';
import { StockInsightsPanel } from '@/components/features/stock/StockInsightsPanel';
import { PeriodAnalysisCard } from '@/components/features/stock/PeriodAnalysisCard';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import type { StockDetailPageProps } from '@/types/stocks';

export default function StockDetail({ stock }: StockDetailPageProps) {
  return (
    <>
      <Head title={`${stock.symbol} - Stocks`} />
      <AuthenticatedLayout>
        <StockDetailContent stock={stock}>
          <StockInsightsPanel
            periodAnalysis={
              <PeriodAnalysisCard
                analysis={stock.latest_period_analysis}
                signal={stock.period_signal}
              />
            }
            relatedNews={<RelatedNewsList articles={stock.related_news} />}
            analyses={<NewsAnalysisList analyses={stock.analyses} />}
            signals={stock.signals}
          />
        </StockDetailContent>
      </AuthenticatedLayout>
    </>
  );
}
