import type { StockSignal } from '@/types/stocks';
import { StatusBadge } from '@/components/ui/status-badge';

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
        <article key={signal.id} className="rounded-md border border-border bg-muted p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground text-sm tabular-nums">
                {signal.signal_date}
              </p>
              <p className="mt-1 text-muted-foreground text-xs tabular-nums">
                generated {formatSignalDateTime(signal.generated_at)}
              </p>
            </div>
            <ScoreBadge score={signal.total_score} />
          </div>
          {signal.reason !== null && (
            <p className="mt-3 text-foreground text-sm leading-6">{signal.reason}</p>
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
    <div className="rounded border border-border bg-card px-2 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold text-card-foreground tabular-nums">{value}</dd>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const variant = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';

  return (
    <StatusBadge variant={variant} className="font-semibold tabular-nums">
      total {formatScore(score)}
    </StatusBadge>
  );
}

function CountBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-muted-foreground tabular-nums">
      {label} {value}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-md border border-border border-dashed bg-muted px-4 py-6 text-center text-muted-foreground text-sm">
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
