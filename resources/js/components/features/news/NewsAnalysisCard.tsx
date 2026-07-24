import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { StatusBadge } from '@/components/ui/status-badge';
import { Surface } from '@/components/ui/surface';
import { cn } from '@/lib/utils';
import { show as stockShow } from '@/routes/stocks';
import type { NewsAnalysis } from '@/types/news';
import { formatNewsDateTime, formatSignedImpactScore } from './news-presenter';
import { SentimentBadge } from './SentimentBadge';

interface NewsAnalysisCardProps {
  analysis: NewsAnalysis;
}

export function NewsAnalysisCard({ analysis }: NewsAnalysisCardProps) {
  return (
    <Surface tone="subtle" padding="md">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <InertiaActionLink
            href={stockShow.url(analysis.stock.id)}
            pendingClassName="opacity-70"
            aria-label={`${analysis.stock.symbol} ${analysis.stock.name} の銘柄詳細を見る`}
            className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-foreground text-sm transition-colors duration-motion-fast ease-standard hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <span>{analysis.stock.symbol}</span>
            <span className="truncate font-normal text-muted-foreground">
              {analysis.stock.name}
            </span>
          </InertiaActionLink>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SentimentBadge sentiment={analysis.sentiment} label={analysis.sentiment_label} />
          <StatusBadge variant="neutral">{analysis.time_horizon_label}</StatusBadge>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3">
        <AnalysisMetric
          label="影響度"
          value={`${formatSignedImpactScore(analysis.impact_score)}/10`}
        />
        <AnalysisMetric label="信頼度" value={`${analysis.confidence_score}%`} />
        <AnalysisMetric
          label="分析日時"
          value={
            analysis.analyzed_at === null ? '日時不明' : formatNewsDateTime(analysis.analyzed_at)
          }
          className="col-span-2 sm:col-span-1"
        />
      </dl>

      <div className="mt-4 flex flex-col gap-4 border-border border-t pt-4">
        <AnalysisText label="判断理由" text={analysis.reason} />
        <AnalysisText label="AI要約" text={analysis.summary} />
        <AnalysisFactors analysis={analysis} />
      </div>
    </Surface>
  );
}

function AnalysisMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

function AnalysisText({ label, text }: { label: string; text: string }) {
  if (text.trim() === '') {
    return null;
  }

  return (
    <div>
      <h4 className="font-medium text-muted-foreground text-xs">{label}</h4>
      <p className="mt-1 break-words whitespace-pre-wrap text-foreground text-sm leading-6">
        {text}
      </p>
    </div>
  );
}

function AnalysisFactors({ analysis }: { analysis: NewsAnalysis }) {
  const groups = [
    {
      label: 'ポジティブ材料',
      values: analysis.positive_factors,
      markerClassName: 'bg-positive',
    },
    {
      label: 'ネガティブ材料',
      values: analysis.negative_factors,
      markerClassName: 'bg-negative',
    },
    {
      label: 'リスク',
      values: analysis.risk_points,
      markerClassName: 'bg-warning',
    },
  ].filter((group) => group.values.length > 0);

  if (groups.length === 0) {
    return <p className="text-muted-foreground text-xs">抽出された材料・リスクはありません</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h4 className="font-medium text-muted-foreground text-xs">{group.label}</h4>
          <ul className="mt-2 flex flex-col gap-2">
            {group.values.map((value, index) => (
              <li
                key={`${group.label}-${index}`}
                className="flex gap-2 text-foreground text-sm leading-5"
              >
                <span
                  aria-hidden="true"
                  className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', group.markerClassName)}
                />
                <span className="min-w-0 break-words">{value}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
