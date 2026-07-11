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
    <div className="rounded border border-gray-200 bg-white px-2 py-1.5">
      <dt className="text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-gray-950">{value}</dd>
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
