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
        <article key={article.id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-gray-500 text-xs">
                <span>{article.source ?? article.provider}</span>
                {article.published_at !== null && (
                  <span>{formatNewsDateTime(article.published_at)}</span>
                )}
              </div>
              <h3 className="mt-2 font-semibold text-gray-950 text-sm leading-6">
                {article.title}
              </h3>
              {article.summary !== null && (
                <p className="mt-2 line-clamp-2 text-gray-600 text-sm leading-6">
                  {article.summary}
                </p>
              )}
            </div>
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 font-medium text-gray-700 text-sm transition-[background-color,border-color,color,transform] hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950 active:translate-y-px focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
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
    <div className="mt-4 rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-gray-500 text-sm">
      {message}
    </div>
  );
}
