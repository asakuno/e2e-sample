import { ExternalLink } from 'lucide-react';
import type { NewsArticle } from '@/types/news';
import { formatNewsDateTime } from './news-presenter';

interface RelatedNewsListProps {
  articles: NewsArticle[];
}

export function RelatedNewsList({ articles }: RelatedNewsListProps) {
  if (articles.length === 0) {
    return <EmptyState message="関連ニュースはまだありません" />;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {articles.map((article) => (
        <article key={article.id} className="rounded-md border border-border bg-muted p-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs tabular-nums">
                <span>{article.source ?? article.provider}</span>
                {article.published_at !== null && (
                  <span>{formatNewsDateTime(article.published_at)}</span>
                )}
              </div>
              <h3 className="mt-2 font-semibold text-foreground text-sm leading-6">
                {article.title}
              </h3>
              {article.summary !== null && (
                <p className="mt-2 line-clamp-2 text-muted-foreground text-sm leading-6">
                  {article.summary}
                </p>
              )}
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-medium text-foreground text-sm transition-[background-color,border-color,color,transform] duration-motion-fast ease-standard hover:border-ring hover:bg-muted active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none"
            >
              元記事
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-md border border-border border-dashed bg-muted px-4 py-6 text-center text-muted-foreground text-sm">
      {message}
    </div>
  );
}
