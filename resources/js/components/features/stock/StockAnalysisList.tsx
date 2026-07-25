import { ArrowDownRight, ArrowUpRight, Clock3, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { SentimentBadge } from '@/components/features/news/SentimentBadge';
import {
  formatNewsDateTime,
  formatSignedImpactScore,
} from '@/components/features/news/news-presenter';
import { Link } from '@inertiajs/react';
import { index as newsIndex } from '@/routes/news';
import type { NewsAnalysis, NewsArticle } from '@/types/news';

interface StockAnalysisListProps {
  analyses: NewsAnalysis[];
  articles: NewsArticle[];
}

export function StockAnalysisList({ analyses, articles }: StockAnalysisListProps) {
  if (analyses.length === 0) {
    return <StockAnalysisEmptyState />;
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-2">
      {analyses.map((analysis) => (
        <StockAnalysisCard
          key={analysis.id}
          analysis={analysis}
          article={findAnalysisArticle(analysis.id, articles)}
        />
      ))}
    </div>
  );
}

interface StockAnalysisCardProps {
  analysis: NewsAnalysis;
  article: NewsArticle | undefined;
}

function StockAnalysisCard({ analysis, article }: StockAnalysisCardProps) {
  const titleId = `stock-analysis-${analysis.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col rounded-lg border border-border bg-muted/45 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SentimentBadge sentiment={analysis.sentiment} label={analysis.sentiment_label} />
            <span className="rounded-full bg-card px-2.5 py-1 font-medium text-foreground text-xs ring-1 ring-border ring-inset">
              影響度 {formatSignedImpactScore(analysis.impact_score)}/10
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
              <Clock3 aria-hidden="true" className="size-3.5" />
              {analysis.time_horizon_label}
            </span>
          </div>
          <h3 id={titleId} className="mt-3 break-words font-semibold text-foreground text-sm">
            {article?.title ?? `${analysis.stock.symbol} のAI分析`}
          </h3>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          信頼度 {analysis.confidence_score}%
        </span>
      </div>

      <p className="mt-3 text-foreground text-sm leading-6">{analysis.summary}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <AnalysisFactorList
          title="ポジティブ材料"
          items={analysis.positive_factors}
          icon={<ArrowUpRight aria-hidden="true" className="size-4" />}
          tone="positive"
        />
        <AnalysisFactorList
          title="ネガティブ材料"
          items={analysis.negative_factors}
          icon={<ArrowDownRight aria-hidden="true" className="size-4" />}
          tone="negative"
        />
      </div>

      <AnalysisRiskList items={analysis.risk_points} />

      {analysis.reason.trim() !== '' && (
        <div className="mt-4 rounded-md border border-border bg-card p-3">
          <p className="font-medium text-muted-foreground text-xs">判断理由</p>
          <p className="mt-1 text-foreground text-sm leading-6">{analysis.reason}</p>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
        <AnalysisTimestamp analyzedAt={analysis.analyzed_at} />
        {article !== undefined && (
          <Link
            href={newsIndex.url({ query: { article_id: article.id } })}
            className="inline-flex min-h-11 items-center rounded-md px-3 py-2 font-medium text-primary text-sm underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[loading]:opacity-70"
          >
            記事の分析を見る
          </Link>
        )}
      </div>
    </article>
  );
}

interface AnalysisFactorListProps {
  title: string;
  items: string[];
  icon: ReactNode;
  tone: 'positive' | 'negative';
}

function AnalysisFactorList({ title, items, icon, tone }: AnalysisFactorListProps) {
  if (items.length === 0) {
    return null;
  }

  const toneClassName = tone === 'positive' ? 'text-positive' : 'text-negative';

  return (
    <section className="rounded-md border border-border bg-card p-3">
      <h4 className={`flex items-center gap-1.5 font-semibold text-xs ${toneClassName}`}>
        {icon}
        {title}
      </h4>
      <ul className="mt-2 flex flex-col gap-1.5 text-foreground text-sm leading-5">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true" className="text-muted-foreground">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnalysisRiskList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-3 rounded-md border border-warning/30 bg-warning-muted/40 p-3">
      <h4 className="flex items-center gap-1.5 font-semibold text-warning text-xs">
        <ShieldAlert aria-hidden="true" className="size-4" />
        リスク
      </h4>
      <ul className="mt-2 flex flex-col gap-1.5 text-foreground text-sm leading-5">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AnalysisTimestamp({ analyzedAt }: { analyzedAt: string | null }) {
  if (analyzedAt === null) {
    return <span className="text-muted-foreground text-xs">分析日時不明</span>;
  }

  return (
    <time dateTime={analyzedAt} className="text-muted-foreground text-xs tabular-nums">
      分析 {formatNewsDateTime(analyzedAt)}
    </time>
  );
}

function StockAnalysisEmptyState() {
  return (
    <div className="mt-4 rounded-md border border-border border-dashed bg-muted px-4 py-6 text-center text-muted-foreground text-sm">
      AI分析結果はまだありません
    </div>
  );
}

function findAnalysisArticle(analysisId: number, articles: NewsArticle[]): NewsArticle | undefined {
  return articles.find((article) =>
    article.analyses.some((analysis) => analysis.id === analysisId),
  );
}
