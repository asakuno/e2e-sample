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
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <SectionHeader
          icon={<Newspaper aria-hidden="true" className="size-5" />}
          title="関連ニュース"
        />
        {relatedNews}
      </section>

      <div className="flex flex-col gap-4">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader
            icon={<Sparkles aria-hidden="true" className="size-5" />}
            title="AI分析結果"
          />
          {analyses}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
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
    <div className="flex items-center gap-2 text-gray-950">
      <span className="text-gray-500">{icon}</span>
      <h2 className="font-semibold text-lg">{title}</h2>
    </div>
  );
}
