import { cn } from '@/lib/utils';

interface WatchlistPriorityBadgeProps {
  priority: number;
}

export function WatchlistPriorityBadge({ priority }: WatchlistPriorityBadgeProps) {
  const presentation = priorityPresentation(priority);

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 font-medium text-xs',
        presentation.className,
      )}
    >
      {presentation.label}
    </span>
  );
}

function priorityPresentation(priority: number): { label: string; className: string } {
  switch (priority) {
    case 3:
      return {
        label: '高',
        className: 'bg-red-50 text-red-700',
      };
    case 2:
      return {
        label: '中',
        className: 'bg-amber-50 text-amber-700',
      };
    case 1:
      return {
        label: '低',
        className: 'bg-gray-100 text-gray-700',
      };
    default:
      return {
        label: `優先度 ${priority}`,
        className: 'bg-gray-100 text-gray-700',
      };
  }
}
