interface SentimentBadgeProps {
  sentiment: number;
  label: string;
}

export function SentimentBadge({ sentiment, label }: SentimentBadgeProps) {
  const colorClass =
    sentiment > 0
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : sentiment < 0
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-gray-200 bg-white text-gray-700';

  return (
    <span className={`rounded-full border px-2 py-0.5 font-medium text-xs ${colorClass}`}>
      {label}
    </span>
  );
}
