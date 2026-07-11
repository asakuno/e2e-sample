import { StatusBadge } from '@/components/ui/status-badge';

interface SentimentBadgeProps {
  sentiment: number;
  label: string;
}

export function SentimentBadge({ sentiment, label }: SentimentBadgeProps) {
  const variant = sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral';

  return <StatusBadge variant={variant}>{label}</StatusBadge>;
}
