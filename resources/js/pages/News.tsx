import { Head } from '@inertiajs/react';
import { NewsArticleList } from '@/components/features/news/NewsArticleList';
import { NewsFiltersPanel } from '@/components/features/news/NewsFiltersPanel';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import type { NewsPageProps } from '@/types/news';

export default function News({ news, filters, stockOptions, sentimentOptions }: NewsPageProps) {
  return (
    <>
      <Head title="News" />
      <AuthenticatedLayout>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-bold text-2xl text-foreground">News</h1>
              <p className="mt-1 text-muted-foreground text-sm">
                市場ニュースを銘柄、sentiment、公開期間で絞り込み、AI分析の要点を確認できます。
              </p>
            </div>
            <div className="rounded-md border border-border bg-card px-3 py-2 text-muted-foreground text-sm">
              表示件数{' '}
              <span className="font-semibold text-foreground tabular-nums">{news.length}</span>
            </div>
          </div>

          <NewsFiltersPanel
            key={`${filters.stock_id}:${filters.sentiment}:${filters.from}:${filters.to}`}
            initialFilters={filters}
            stockOptions={stockOptions}
            sentimentOptions={sentimentOptions}
          />

          <NewsArticleList articles={news} />
        </div>
      </AuthenticatedLayout>
    </>
  );
}
