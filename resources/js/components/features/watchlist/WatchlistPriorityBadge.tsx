import { cn } from '@/lib/utils';

interface WatchlistPriorityBadgeProps {
  priority: number;
}

export function WatchlistPriorityBadge({ priority }: WatchlistPriorityBadgeProps) {
  const presentation = priorityPresentation(priority);

  return (
    <span
      data-slot="watchlist-priority-badge"
      data-priority={presentation.level}
      className={cn(
        'inline-flex min-h-6 items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-xs ring-1 ring-inset tabular-nums',
        presentation.level === 'high' && 'bg-primary text-primary-foreground ring-primary',
        presentation.level === 'medium' && 'bg-warning-muted text-warning ring-warning/20',
        (presentation.level === 'low' || presentation.level === 'custom') &&
          'bg-muted text-muted-foreground ring-border',
      )}
    >
      {presentation.label}
    </span>
  );
}

type PriorityLevel = 'high' | 'medium' | 'low' | 'custom';

function priorityPresentation(priority: number): {
  label: string;
  level: PriorityLevel;
} {
  switch (priority) {
    case 3:
      return {
        label: '高',
        level: 'high',
      };
    case 2:
      return {
        label: '中',
        level: 'medium',
      };
    case 1:
      return {
        label: '低',
        level: 'low',
      };
    default:
      return {
        label: `優先度 ${priority}`,
        level: 'custom',
      };
  }
}
