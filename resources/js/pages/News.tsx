import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { NewsArticleList } from '@/components/features/news/NewsArticleList';
import { NewsFiltersPanel } from '@/components/features/news/NewsFiltersPanel';
import { Pagination } from '@/components/ui/Pagination';
import { Surface } from '@/components/ui/surface';
import { type InertiaPageComponent, withAuthenticatedLayout } from '@/layouts/page-layouts';
import { index as newsIndex } from '@/routes/news';
import type { NewsPageProps } from '@/types/news';

const News: InertiaPageComponent<NewsPageProps> = ({
  news,
  filters,
  stockOptions,
  sentimentOptions,
}) => {
  const hasSelectedArticle = filters.article_id !== '';
  const searchFilters = hasSelectedArticle ? { ...filters, article_id: '' } : filters;
  const filtersKey = [
    filters.article_id,
    filters.stock_id,
    filters.sentiment,
    filters.analysis_status,
    filters.from,
    filters.to,
  ].join(':');
  const newsListKey = `${filtersKey}:${news.data.map((article) => article.id).join(',')}`;
  const selectedArticleId = hasSelectedArticle ? Number(filters.article_id) : null;

  const filtersPanel = (
    <NewsFiltersPanel
      key={filtersKey}
      initialFilters={searchFilters}
      stockOptions={stockOptions}
      sentimentOptions={sentimentOptions}
    />
  );

  return (
    <>
      <Head title="News" />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-bold text-2xl text-foreground">News</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              市場ニュースを銘柄、sentiment、分析状態、公開期間で絞り込み、AI分析の要点を確認できます。
            </p>
          </div>
          <div className="rounded-md border border-border bg-card px-3 py-2 text-muted-foreground text-sm">
            該当件数{' '}
            <span className="font-semibold text-foreground tabular-nums">
              {news.meta.total.toLocaleString('ja-JP')}
            </span>
          </div>
        </div>

        {hasSelectedArticle ? (
          <>
            <SelectedArticleNotice />
            <NewsArticleList
              key={newsListKey}
              articles={news.data}
              initialExpandedArticleId={selectedArticleId}
            />
            <Pagination links={news.links} meta={news.meta} itemLabel="件" />
            <section aria-labelledby="other-news-search-heading" className="flex flex-col gap-4">
              <div>
                <h2
                  id="other-news-search-heading"
                  className="font-semibold text-foreground text-lg"
                >
                  他のニュースを探す
                </h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  選択中の記事を解除して、別の条件でニュースを検索します。
                </p>
              </div>
              {filtersPanel}
            </section>
          </>
        ) : (
          <>
            {filtersPanel}
            <NewsArticleList key={newsListKey} articles={news.data} />
            <Pagination links={news.links} meta={news.meta} itemLabel="件" />
          </>
        )}
      </div>
    </>
  );
};

News.layout = withAuthenticatedLayout;

export default News;

function SelectedArticleNotice() {
  return (
    <Surface
      tone="subtle"
      padding="md"
      className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
    >
      <div role="status" className="min-w-0">
        <h2 className="font-semibold text-foreground text-base">
          ダッシュボードから選択した記事を表示中
        </h2>
        <p className="mt-1 text-muted-foreground text-sm">
          記事の詳細は、この画面内で開閉できます。
        </p>
      </div>
      <Link
        href={newsIndex.url()}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 font-medium text-foreground text-sm transition-[background-color,border-color,color,opacity,transform] duration-motion-fast ease-standard hover:border-ring hover:bg-muted active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[loading]:opacity-70 motion-reduce:transition-none motion-reduce:active:translate-y-0"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        一覧に戻す
      </Link>
    </Surface>
  );
}
