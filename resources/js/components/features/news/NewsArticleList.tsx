import { useState } from 'react';
import type { NewsArticle } from '@/types/news';
import { NewsArticleCard } from './NewsArticleCard';

interface NewsArticleListProps {
  articles: NewsArticle[];
  initialExpandedArticleId?: number | null;
}

export function NewsArticleList({
  articles,
  initialExpandedArticleId = null,
}: NewsArticleListProps) {
  const [expandedArticleId, setExpandedArticleId] = useState<number | null>(() =>
    initialExpandedArticleId !== null &&
    articles.some((article) => article.id === initialExpandedArticleId)
      ? initialExpandedArticleId
      : null,
  );

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
        <NewsArticleCard
          key={article.id}
          article={article}
          expanded={expandedArticleId === article.id}
          onToggle={() =>
            setExpandedArticleId((currentArticleId) =>
              currentArticleId === article.id ? null : article.id,
            )
          }
        />
      ))}
    </div>
  );
}
