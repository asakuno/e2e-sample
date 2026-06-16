import { ExternalLink, Newspaper, RadioTower, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NewsAnalysis, NewsArticle } from '@/types/news';
import type { StockDetail, StockSignal } from '@/types/stocks';

type StockInsightsPanelProps = {
  stock: StockDetail;
};

export function StockInsightsPanel({ stock }: StockInsightsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <SectionHeader
          icon={<Newspaper aria-hidden="true" className="size-5" />}
          title="関連ニュース"
        />
        <RelatedNewsList articles={stock.related_news} />
      </section>

      <div className="flex flex-col gap-4">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={<Sparkles aria-hidden="true" className="size-5" />}
            title="AI分析結果"
          />
          <AnalysisList analyses={stock.analyses} />
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={<RadioTower aria-hidden="true" className="size-5" />}
            title="シグナル"
          />
          <SignalList signals={stock.signals} />
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-950">
      <span className="text-gray-500">{icon}</span>
      <h2 className="font-semibold text-lg">{title}</h2>
    </div>
  );
}

function RelatedNewsList({ articles }: { articles: NewsArticle[] }) {
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
                  <span>{formatDateTime(article.published_at)}</span>
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

function AnalysisList({ analyses }: { analyses: NewsAnalysis[] }) {
  if (analyses.length === 0) {
    return <EmptyState message="AI分析結果はまだありません" />;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {analyses.map((analysis) => (
        <article key={analysis.id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SentimentBadge sentiment={analysis.sentiment} label={analysis.sentiment_label} />
            <span className="text-gray-500 text-xs">信頼度 {analysis.confidence_score}%</span>
          </div>
          <p className="mt-3 text-gray-700 text-sm leading-6">AI要約: {analysis.summary}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <InsightMetric label="impact" value={`${analysis.impact_score}/10`} />
            <InsightMetric
              label="analyzed"
              value={analysis.analyzed_at === null ? '-' : formatDateTime(analysis.analyzed_at)}
            />
          </dl>
        </article>
      ))}
    </div>
  );
}

function SignalList({ signals }: { signals: StockSignal[] }) {
  if (signals.length === 0) {
    return <EmptyState message="シグナルはまだありません" />;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {signals.map((signal) => (
        <article key={signal.id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-950 text-sm">
                {formatDate(signal.signal_date)}
              </p>
              <p className="mt-1 text-gray-500 text-xs">
                generated {formatDateTime(signal.generated_at)}
              </p>
            </div>
            <ScoreBadge score={signal.total_score} />
          </div>
          {signal.reason !== null && (
            <p className="mt-3 text-gray-700 text-sm leading-6">{signal.reason}</p>
          )}
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <InsightMetric label="news" value={formatScore(signal.news_score)} />
            <InsightMetric label="disclosure" value={formatScore(signal.disclosure_score)} />
            <InsightMetric label="macro" value={formatScore(signal.macro_score)} />
          </dl>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <CountBadge label="positive" value={signal.positive_count} />
            <CountBadge label="neutral" value={signal.neutral_count} />
            <CountBadge label="negative" value={signal.negative_count} />
          </div>
        </article>
      ))}
    </div>
  );
}

function InsightMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-200 bg-white px-2 py-1.5">
      <dt className="text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-gray-950">{value}</dd>
    </div>
  );
}

function SentimentBadge({ sentiment, label }: { sentiment: number; label: string }) {
  const colorClass =
    sentiment > 0
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : sentiment < 0
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-gray-200 bg-white text-gray-700';

  return (
    <span className={`rounded-full border px-2 py-0.5 font-medium text-xs ${colorClass}`}>
      {label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const colorClass =
    score > 0
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : score < 0
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-gray-200 bg-white text-gray-700';

  return (
    <span className={`rounded-full border px-2.5 py-1 font-semibold text-xs ${colorClass}`}>
      total {formatScore(score)}
    </span>
  );
}

function CountBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-gray-600">
      {label} {value}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-gray-500 text-sm">
      {message}
    </div>
  );
}

function formatScore(value: number): string {
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function formatDate(value: string): string {
  return value;
}

function formatDateTime(value: string): string {
  const normalized = value.replace('T', ' ');

  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized;
}
