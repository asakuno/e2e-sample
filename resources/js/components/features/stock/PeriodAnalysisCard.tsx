import { ArrowRight, CalendarRange } from 'lucide-react';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { StatusBadge } from '@/components/ui/status-badge';
import { show } from '@/routes/analysis';
import type { PeriodAnalysisSummary, PeriodAnalysisSignal } from '@/types/stocks';

interface PeriodAnalysisCardProps {
  analysis: PeriodAnalysisSummary | null;
  signal: PeriodAnalysisSignal | null;
}

export function PeriodAnalysisCard({ analysis, signal }: PeriodAnalysisCardProps) {
  if (analysis == null) {
    return (
      <p className="mt-3 rounded-md bg-muted p-3 text-muted-foreground text-sm">
        この銘柄の期間ニュース分析はまだありません。
      </p>
    );
  }

  return (
    <div className="mt-3 grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge variant={analysis.impact_score >= 0 ? 'positive' : 'negative'}>
          impact {analysis.impact_score} / confidence {analysis.confidence_score}
        </StatusBadge>
        <span className="text-muted-foreground text-xs">
          revision {analysis.revision ?? '—'} / {analysis.sentiment_label}
        </span>
      </div>
      <p>{analysis.summary}</p>
      <p className="text-muted-foreground text-sm">{analysis.reason}</p>
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <CalendarRange aria-hidden="true" className="size-4" />
        {analysis.period_start}〜{analysis.period_end}
      </div>
      {signal != null && (
        <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-3 text-sm">
          <span>期間ニューススコア</span>
          <strong className="text-right tabular-nums">{signal.news_score.toFixed(2)}</strong>
          <span>根拠分類</span>
          <span className="text-right tabular-nums">
            +{signal.positive_count} / -{signal.negative_count} / 中立{signal.neutral_count}
          </span>
        </div>
      )}
      <InertiaActionLink
        href={show.url(analysis.public_id)}
        className="inline-flex min-h-11 w-fit items-center gap-2 font-medium text-primary text-sm"
      >
        revisionと根拠を確認
        <ArrowRight aria-hidden="true" className="size-4" />
      </InertiaActionLink>
    </div>
  );
}
