import { ExternalLink } from 'lucide-react';
import type { NewsAnalysis, NewsArticle, NewsArticleStock } from '@/types/news';
import { formatNewsDateTime } from './news-presenter';
import { SentimentBadge } from './SentimentBadge';

interface NewsArticleListProps {
  articles: NewsArticle[];
}

export function NewsArticleList({ articles }: NewsArticleListProps) {
  if (articles.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center shadow-sm">
        <p className="font-medium text-card-foreground">該当するニュースがありません</p>
        <p className="mt-2 text-muted-foreground text-sm">条件を変更して再度検索してください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {articles.map((article) => (
        <NewsArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

function NewsArticleCard({ article }: { article: NewsArticle }) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs tabular-nums">
              <span>{article.source ?? article.provider}</span>
              {article.published_at !== null && (
                <span>{formatNewsDateTime(article.published_at)}</span>
              )}
              {article.language !== null && (
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                  {article.language.toUpperCase()}
                </span>
              )}
            </div>
            <h2 className="mt-2 font-semibold text-card-foreground text-lg leading-7">
              {article.title}
            </h2>
            {article.summary !== null && (
              <p className="mt-2 line-clamp-3 text-muted-foreground text-sm leading-6">
                {article.summary}
              </p>
            )}
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-border px-3 py-2 font-medium text-foreground text-sm transition-[background-color,border-color,color,transform] duration-motion-fast ease-standard hover:border-ring hover:bg-muted active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:active:translate-y-0"
          >
            元記事
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </div>

        <RelatedStocks stocks={article.stocks} />
        <AnalysisSummary analyses={article.analyses} />
      </div>
    </article>
  );
}

function RelatedStocks({ stocks }: { stocks: NewsArticleStock[] }) {
  if (stocks.length === 0) {
    return <p className="text-muted-foreground text-sm">関連銘柄なし</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {stocks.map((stock) => (
        <span
          key={stock.id}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-foreground text-xs"
        >
          <span className="font-semibold text-foreground">{stock.symbol}</span>
          <span>{stock.name}</span>
          {stock.relevance_score !== null && (
            <span className="text-muted-foreground tabular-nums">
              関連度 {stock.relevance_score}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function AnalysisSummary({ analyses }: { analyses: NewsAnalysis[] }) {
  if (analyses.length === 0) {
    return (
      <div className="rounded-md border border-border border-dashed bg-muted px-4 py-3 text-muted-foreground text-sm">
        AI分析は未実施です
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {analyses.map((analysis) => (
        <div key={analysis.id} className="rounded-md border border-border bg-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">{analysis.stock.symbol}</span>
              <SentimentBadge sentiment={analysis.sentiment} label={analysis.sentiment_label} />
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              信頼度 {analysis.confidence_score}%
            </span>
          </div>
          <p className="mt-3 text-foreground text-sm leading-6">AI要約: {analysis.summary}</p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">impact score</span>
              <span className="font-semibold text-foreground tabular-nums">
                {analysis.impact_score}/10
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-border">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.min(Math.max(analysis.impact_score, 0), 10) * 10}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
