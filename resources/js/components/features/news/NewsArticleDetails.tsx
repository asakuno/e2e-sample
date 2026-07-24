import { ExternalLink } from 'lucide-react';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { show as stockShow } from '@/routes/stocks';
import type { NewsAnalysis, NewsArticle, NewsArticleStock } from '@/types/news';
import { NewsAnalysisCard } from './NewsAnalysisCard';

export function NewsArticleDetails({ article }: { article: NewsArticle }) {
  return (
    <div className="flex flex-col gap-6 border-border border-t pt-5">
      <ArticleSummary summary={article.summary} />
      <RelatedStocks stocks={article.stocks} />
      <AnalysisDetails analyses={article.analyses} />

      <div className="flex sm:justify-end">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 font-medium text-foreground text-sm transition-[background-color,border-color,color,transform] duration-motion-fast ease-standard hover:border-ring hover:bg-muted active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:translate-y-0 sm:w-auto"
        >
          元記事を読む
          <span className="sr-only">（新しいタブで開きます）</span>
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      </div>
    </div>
  );
}

function ArticleSummary({ summary }: { summary: string | null }) {
  return (
    <section>
      <h3 className="font-semibold text-card-foreground text-sm">記事の要約</h3>
      {summary !== null && summary.trim() !== '' ? (
        <p className="mt-2 break-words whitespace-pre-wrap text-foreground text-sm leading-6">
          {summary}
        </p>
      ) : (
        <p className="mt-2 text-muted-foreground text-sm">記事の要約はありません</p>
      )}
    </section>
  );
}

function RelatedStocks({ stocks }: { stocks: NewsArticleStock[] }) {
  return (
    <section>
      <h3 className="font-semibold text-card-foreground text-sm">関連銘柄</h3>
      {stocks.length === 0 ? (
        <p className="mt-2 text-muted-foreground text-sm">関連銘柄はありません</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {stocks.map((stock) => (
            <li key={stock.id}>
              <InertiaActionLink
                href={stockShow.url(stock.id)}
                pendingClassName="opacity-70"
                className="block min-h-11 rounded-md border border-border bg-muted/55 p-3 transition-[background-color,border-color] duration-motion-fast ease-standard hover:border-ring hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-semibold text-foreground text-sm">{stock.symbol}</span>
                  <span className="min-w-0 break-words text-foreground text-sm">{stock.name}</span>
                </span>
                <span className="mt-1 block text-muted-foreground text-xs tabular-nums">
                  関連度 {stock.relevance_score ?? '未算出'}
                </span>
              </InertiaActionLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AnalysisDetails({ analyses }: { analyses: NewsAnalysis[] }) {
  return (
    <section>
      <h3 className="font-semibold text-card-foreground text-sm">AI分析</h3>
      {analyses.length === 0 ? (
        <p className="mt-3 rounded-md border border-border border-dashed bg-muted/35 px-4 py-3 text-muted-foreground text-sm">
          AI分析は未実施です
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {analyses.map((analysis) => (
            <li key={analysis.id}>
              <NewsAnalysisCard analysis={analysis} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
