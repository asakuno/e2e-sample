import { Newspaper, RadioTower, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import type { StockSignal } from '@/types/stocks';
import { StockSignalList } from './StockSignalList';

interface StockInsightsPanelProps {
  periodAnalysis: ReactNode;
  relatedNews: ReactNode;
  analyses: ReactNode;
  signals: StockSignal[];
}

export function StockInsightsPanel({
  periodAnalysis,
  relatedNews,
  analyses,
  signals,
}: StockInsightsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <SectionHeader
          icon={<Newspaper aria-hidden="true" className="size-5" />}
          title="関連ニュース"
        />
        {relatedNews}
      </section>

      <div className="flex flex-col gap-4">
        <section className="rounded-lg border border-primary/25 bg-card p-5 shadow-sm">
          <SectionHeader
            icon={<Sparkles aria-hidden="true" className="size-5" />}
            title="Current期間ニュース分析"
          />
          {periodAnalysis}
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <SectionHeader
            icon={<Sparkles aria-hidden="true" className="size-5" />}
            title="記事単位の分析結果"
          />
          {analyses}
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <SectionHeader
            icon={<RadioTower aria-hidden="true" className="size-5" />}
            title="シグナル"
          />
          <StockSignalList signals={signals} />
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-card-foreground">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="font-semibold text-lg">{title}</h2>
    </div>
  );
}
