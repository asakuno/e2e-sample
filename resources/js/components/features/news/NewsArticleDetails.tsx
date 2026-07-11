import { ExternalLink } from 'lucide-react';
import type { NewsAnalysis, NewsArticle, NewsArticleStock } from '@/types/news';
import { formatNewsDateTime, formatSignedImpactScore } from './news-presenter';
import { SentimentBadge } from './SentimentBadge';

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
            <li key={stock.id} className="rounded-md border border-border bg-muted/55 p-3">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-semibold text-foreground text-sm">{stock.symbol}</span>
                <span className="min-w-0 break-words text-foreground text-sm">{stock.name}</span>
              </div>
              <p className="mt-1 text-muted-foreground text-xs tabular-nums">
                関連度 {stock.relevance_score ?? '未算出'}
              </p>
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
            <li key={analysis.id} className="rounded-md border border-border bg-muted/55 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm">{analysis.stock.symbol}</p>
                  <p className="mt-0.5 break-words text-muted-foreground text-xs">
                    {analysis.stock.name}
                  </p>
                </div>
                <SentimentBadge sentiment={analysis.sentiment} label={analysis.sentiment_label} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">影響度</dt>
                  <dd className="mt-1 font-semibold text-foreground tabular-nums">
                    {formatSignedImpactScore(analysis.impact_score)}/10
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">信頼度</dt>
                  <dd className="mt-1 font-semibold text-foreground tabular-nums">
                    {analysis.confidence_score}%
                  </dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-muted-foreground">分析日時</dt>
                  <dd className="mt-1 text-foreground tabular-nums">
                    {analysis.analyzed_at === null
                      ? '日時不明'
                      : formatNewsDateTime(analysis.analyzed_at)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 border-border border-t pt-3">
                <h4 className="font-medium text-muted-foreground text-xs">AI要約</h4>
                <p className="mt-1 break-words whitespace-pre-wrap text-foreground text-sm leading-6">
                  {analysis.summary}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
