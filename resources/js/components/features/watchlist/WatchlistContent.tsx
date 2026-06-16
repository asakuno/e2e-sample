import type { WatchlistItem } from '@/types/watchlist';
import { WatchlistEmptyState } from './WatchlistEmptyState';
import { WatchlistTable } from './WatchlistTable';

interface WatchlistContentProps {
  items: WatchlistItem[];
  editMemoAction?: ((item: WatchlistItem) => void | Promise<void>) | undefined;
  removeAction?: ((item: WatchlistItem) => void | Promise<void>) | undefined;
}

export function WatchlistContent({ items, editMemoAction, removeAction }: WatchlistContentProps) {
  if (items.length === 0) {
    return <WatchlistEmptyState />;
  }

  return (
    <WatchlistTable items={items} editMemoAction={editMemoAction} removeAction={removeAction} />
  );
}
