import { ArrowRight, ExternalLink } from 'lucide-react';
import { SentimentBadge } from '@/components/features/news/SentimentBadge';
import {
  formatNewsDateTime,
  formatSignedImpactScore,
  selectPrimaryAnalysis,
} from '@/components/features/news/news-presenter';
import { Link } from '@inertiajs/react';
import { index as newsIndex } from '@/routes/news';
import type { NewsAnalysis, NewsArticle } from '@/types/news';

interface StockRelatedNewsListProps {
  articles: NewsArticle[];
}

export function StockRelatedNewsList({ articles }: StockRelatedNewsListProps) {
  if (articles.length === 0) {
    return <StockRelatedNewsEmptyState />;
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
      {articles.map((article) => (
        <StockRelatedNewsCard key={article.id} article={article} />
      ))}
    </div>
  );
}

function StockRelatedNewsCard({ article }: { article: NewsArticle }) {
  const analysis = selectPrimaryAnalysis(article.analyses);
  const titleId = `stock-related-news-${article.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col rounded-lg border border-border bg-muted/45 p-4"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
        <span>{article.source?.trim() || article.provider}</span>
        <span aria-hidden="true">•</span>
        <PublishedAt publishedAt={article.published_at} />
      </div>

      <h3 id={titleId} className="mt-2 break-words font-semibold text-foreground text-sm leading-6">
        {article.title}
      </h3>

      {article.summary !== null && article.summary.trim() !== '' && (
        <p className="mt-2 line-clamp-2 text-muted-foreground text-sm leading-6">
          {article.summary}
        </p>
      )}

      <RelatedNewsAnalysis analysis={analysis} />

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <Link
          href={newsIndex.url({ query: { article_id: article.id } })}
          className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 py-2 font-medium text-primary text-sm transition-[background-color,color,transform] hover:bg-card active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:active:translate-y-0 data-[loading]:opacity-70"
        >
          Newsで分析を見る
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-medium text-foreground text-sm transition-[background-color,border-color,color,transform] hover:border-ring hover:bg-muted active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:active:translate-y-0"
        >
          元記事
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      </div>
    </article>
  );
}

function RelatedNewsAnalysis({ analysis }: { analysis: NewsAnalysis | undefined }) {
  if (analysis === undefined) {
    return (
      <div className="mt-3 rounded-md border border-border border-dashed bg-card px-3 py-2 text-muted-foreground text-xs">
        AI分析は未実施です
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <SentimentBadge sentiment={analysis.sentiment} label={analysis.sentiment_label} />
        <span className="font-medium text-foreground text-xs tabular-nums">
          影響度 {formatSignedImpactScore(analysis.impact_score)}/10
        </span>
        <span className="text-muted-foreground text-xs">{analysis.time_horizon_label}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-foreground text-sm leading-5">{analysis.summary}</p>
    </div>
  );
}

function PublishedAt({ publishedAt }: { publishedAt: string | null }) {
  if (publishedAt === null) {
    return <span>公開日時不明</span>;
  }

  return (
    <time dateTime={publishedAt} className="tabular-nums">
      {formatNewsDateTime(publishedAt)}
    </time>
  );
}

function StockRelatedNewsEmptyState() {
  return (
    <div className="mt-4 rounded-md border border-border border-dashed bg-muted px-4 py-6 text-center text-muted-foreground text-sm">
      関連ニュースはまだありません
    </div>
  );
}
