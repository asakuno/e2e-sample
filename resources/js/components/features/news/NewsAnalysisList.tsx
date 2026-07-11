import type { NewsAnalysis } from '@/types/news';
import { formatNewsDateTime } from './news-presenter';
import { SentimentBadge } from './SentimentBadge';

interface NewsAnalysisListProps {
  analyses: NewsAnalysis[];
}

export function NewsAnalysisList({ analyses }: NewsAnalysisListProps) {
  if (analyses.length === 0) {
    return <EmptyState message="AI分析結果はまだありません" />;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {analyses.map((analysis) => (
        <article key={analysis.id} className="rounded-md border border-border bg-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SentimentBadge sentiment={analysis.sentiment} label={analysis.sentiment_label} />
            <span className="text-muted-foreground text-xs tabular-nums">
              信頼度 {analysis.confidence_score}%
            </span>
          </div>
          <p className="mt-3 text-foreground text-sm leading-6">AI要約: {analysis.summary}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <InsightMetric label="impact" value={`${analysis.impact_score}/10`} />
            <InsightMetric
              label="analyzed"
              value={analysis.analyzed_at === null ? '-' : formatNewsDateTime(analysis.analyzed_at)}
            />
          </dl>
        </article>
      ))}
    </div>
  );
}

function InsightMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-card px-2 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold text-card-foreground tabular-nums">{value}</dd>
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
