import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { cn } from '@/lib/utils';
import type { NewsAnalysis, NewsArticle, NewsArticleStock } from '@/types/news';
import { NewsArticleDetails } from './NewsArticleDetails';
import {
  formatNewsDateTime,
  formatSignedImpactScore,
  selectPrimaryAnalysis,
} from './news-presenter';
import { SentimentBadge } from './SentimentBadge';

export function NewsArticleCard({
  article,
  expanded,
  onToggle,
}: {
  article: NewsArticle;
  expanded: boolean;
  onToggle: () => void;
}) {
  const titleId = `news-article-${article.id}-title`;
  const detailsId = `news-article-${article.id}-details`;
  const publisher = article.source?.trim() || article.provider;

  return (
    <Surface asChild padding="lg" className="min-w-0">
      <article aria-labelledby={titleId}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
          <span>{publisher}</span>
          <span aria-hidden="true">•</span>
          {article.published_at === null ? (
            <span>公開日時不明</span>
          ) : (
            <time dateTime={article.published_at.replace(' ', 'T')} className="tabular-nums">
              {formatNewsDateTime(article.published_at)}
            </time>
          )}
          {article.language !== null && article.language.trim() !== '' ? (
            <>
              <span aria-hidden="true">•</span>
              <span>{article.language}</span>
            </>
          ) : null}
        </div>

        <h2
          id={titleId}
          className="mt-3 break-words font-semibold text-card-foreground text-lg leading-7"
        >
          {article.title}
        </h2>

        {!expanded ? (
          <div className="mt-5 flex flex-col gap-4">
            <CompactRelatedStocks stocks={article.stocks} />
            <CompactAnalysis analyses={article.analyses} />
          </div>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={onToggle}
          className="mt-4 w-full justify-between px-3 motion-reduce:transition-none"
        >
          <span>
            記事の詳細
            <span className="sr-only">：{article.title}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'transition-transform duration-motion-fast ease-standard motion-reduce:transition-none',
              expanded && 'rotate-180',
            )}
          />
        </Button>

        <div id={detailsId} hidden={!expanded} className="mt-4">
          <NewsArticleDetails article={article} />
        </div>
      </article>
    </Surface>
  );
}

function CompactRelatedStocks({ stocks }: { stocks: NewsArticleStock[] }) {
  if (stocks.length === 0) {
    return <p className="text-muted-foreground text-sm">関連銘柄なし</p>;
  }

  const visibleStocks = stocks.slice(0, 2);
  const hiddenStockCount = stocks.length - visibleStocks.length;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <span className="font-medium text-muted-foreground text-xs">関連銘柄</span>
      <ul className="flex min-w-0 flex-wrap gap-2" aria-label="関連銘柄">
        {visibleStocks.map((stock) => (
          <li
            key={stock.id}
            className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground text-xs"
          >
            {stock.symbol}
          </li>
        ))}
        {hiddenStockCount > 0 ? (
          <li className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground text-xs tabular-nums">
            <span aria-hidden="true">+{hiddenStockCount}</span>
            <span className="sr-only">他{hiddenStockCount}銘柄</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function CompactAnalysis({ analyses }: { analyses: NewsAnalysis[] }) {
  const primaryAnalysis = selectPrimaryAnalysis(analyses);

  if (primaryAnalysis === undefined) {
    return (
      <div className="rounded-md border border-border border-dashed bg-muted/35 px-4 py-3">
        <p className="text-muted-foreground text-sm">AI分析は未実施です</p>
      </div>
    );
  }

  const additionalAnalysisCount = analyses.length - 1;

  return (
    <div className="rounded-md border border-border bg-muted/55 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="font-medium text-muted-foreground text-xs">主なAI分析</h3>
          <span className="font-semibold text-foreground text-sm">
            {primaryAnalysis.stock.symbol}
          </span>
          <SentimentBadge
            sentiment={primaryAnalysis.sentiment}
            label={primaryAnalysis.sentiment_label}
          />
        </div>
        <span className="font-semibold text-foreground text-sm tabular-nums">
          影響度 {formatSignedImpactScore(primaryAnalysis.impact_score)}/10
        </span>
      </div>

      <p className="mt-3 line-clamp-1 break-words text-foreground text-sm">
        AI要約: {primaryAnalysis.summary}
      </p>

      {additionalAnalysisCount > 0 ? (
        <p className="mt-2 text-muted-foreground text-xs tabular-nums">
          他{additionalAnalysisCount}件の分析
        </p>
      ) : null}
    </div>
  );
}
