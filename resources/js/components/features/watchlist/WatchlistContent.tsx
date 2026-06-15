import type { WatchlistItem } from '@/types/watchlist';
import { WatchlistEmptyState } from './WatchlistEmptyState';
import { WatchlistTable } from './WatchlistTable';

interface WatchlistContentProps {
  items: WatchlistItem[];
  onEditMemo?: ((item: WatchlistItem) => void) | undefined;
  onRemove?: ((item: WatchlistItem) => void) | undefined;
}

export function WatchlistContent({ items, onEditMemo, onRemove }: WatchlistContentProps) {
  if (items.length === 0) {
    return <WatchlistEmptyState />;
  }

  return <WatchlistTable items={items} onEditMemo={onEditMemo} onRemove={onRemove} />;
}
