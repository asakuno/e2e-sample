import type { StockSignal } from '@/types/stocks';

interface StockSignalListProps {
  signals: StockSignal[];
}

export function StockSignalList({ signals }: StockSignalListProps) {
  if (signals.length === 0) {
    return <EmptyState message="シグナルはまだありません" />;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {signals.map((signal) => (
        <article key={signal.id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-950 text-sm">{signal.signal_date}</p>
              <p className="mt-1 text-gray-500 text-xs">
                generated {formatSignalDateTime(signal.generated_at)}
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

function formatSignalDateTime(value: string): string {
  const normalized = value.replace('T', ' ');

  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized;
}
