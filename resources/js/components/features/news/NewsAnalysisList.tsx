import type { NewsAnalysis } from '@/types/news';
import { NewsAnalysisCard } from './NewsAnalysisCard';

interface NewsAnalysisListProps {
  analyses: NewsAnalysis[];
}

export function NewsAnalysisList({ analyses }: NewsAnalysisListProps) {
  if (analyses.length === 0) {
    return <EmptyState message="AI分析結果はまだありません" />;
  }

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {analyses.map((analysis) => (
        <li key={analysis.id}>
          <NewsAnalysisCard analysis={analysis} />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-md border border-border border-dashed bg-muted px-4 py-6 text-center text-muted-foreground text-sm">
      {message}
    </div>
  );
}
