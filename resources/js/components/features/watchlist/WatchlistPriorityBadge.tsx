import { StatusBadge } from '@/components/ui/status-badge';

interface WatchlistPriorityBadgeProps {
  priority: number;
}

export function WatchlistPriorityBadge({ priority }: WatchlistPriorityBadgeProps) {
  const presentation = priorityPresentation(priority);

  return (
    <StatusBadge variant={presentation.variant} className="tabular-nums">
      {presentation.label}
    </StatusBadge>
  );
}

type PriorityBadgeVariant = 'negative' | 'warning' | 'neutral';

function priorityPresentation(priority: number): {
  label: string;
  variant: PriorityBadgeVariant;
} {
  switch (priority) {
    case 3:
      return {
        label: '高',
        variant: 'negative',
      };
    case 2:
      return {
        label: '中',
        variant: 'warning',
      };
    case 1:
      return {
        label: '低',
        variant: 'neutral',
      };
    default:
      return {
        label: `優先度 ${priority}`,
        variant: 'neutral',
      };
  }
}
