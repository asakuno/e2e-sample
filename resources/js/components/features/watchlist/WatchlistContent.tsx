import type { WatchlistItem } from '@/types/watchlist';
import { WatchlistEmptyState } from './WatchlistEmptyState';
import { WatchlistTable } from './WatchlistTable';

interface WatchlistContentProps {
  items: WatchlistItem[];
  onEditMemo?: ((item: WatchlistItem) => void) | undefined;
  removeAction?: ((item: WatchlistItem) => Promise<void>) | undefined;
}

export function WatchlistContent({ items, onEditMemo, removeAction }: WatchlistContentProps) {
  if (items.length === 0) {
    return <WatchlistEmptyState />;
  }

  return <WatchlistTable items={items} onEditMemo={onEditMemo} removeAction={removeAction} />;
}
