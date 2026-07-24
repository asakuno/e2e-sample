import { Newspaper, RadioTower, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import type { StockSignal } from '@/types/stocks';
import { StockSignalList } from './StockSignalList';

interface StockInsightsPanelProps {
  relatedNews: ReactNode;
  analyses: ReactNode;
  signals: StockSignal[];
}

export function StockInsightsPanel({ relatedNews, analyses, signals }: StockInsightsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <SectionHeader
          icon={<RadioTower aria-hidden="true" className="size-5" />}
          title="シグナル"
        />
        <StockSignalList signals={signals} />
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <SectionHeader
          icon={<Sparkles aria-hidden="true" className="size-5" />}
          title="AI分析サマリー・材料"
        />
        {analyses}
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <SectionHeader
          icon={<Newspaper aria-hidden="true" className="size-5" />}
          title="関連ニュース"
        />
        {relatedNews}
      </section>
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
