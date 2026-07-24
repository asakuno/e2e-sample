import { Check, Eye, Pencil } from 'lucide-react';
import { useState } from 'react';
import { WatchlistEditDialog } from '@/components/features/watchlist/WatchlistEditDialog';
import { WatchlistPriorityBadge } from '@/components/features/watchlist/WatchlistPriorityBadge';
import { ActionButton } from '@/components/ui/ActionButton';
import { Button } from '@/components/ui/button';
import type { StockDetail } from '@/types/stocks';
import type { WatchlistItem } from '@/types/watchlist';

interface StockWatchlistControlProps {
  stock: StockDetail;
  addAction: () => Promise<void>;
}

export function StockWatchlistControl({ stock, addAction }: StockWatchlistControlProps) {
  if (stock.watchlist === null) {
    return <StockWatchlistAddAction symbol={stock.symbol} addAction={addAction} />;
  }

  return <StockWatchlistSummary stock={stock} />;
}

function StockWatchlistAddAction({
  symbol,
  addAction,
}: {
  symbol: string;
  addAction: () => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton
        variant="outline"
        size="sm"
        action={addAction}
        pendingLabel="追加中..."
        aria-label={`${symbol} をウォッチリストに追加`}
      >
        <Eye aria-hidden="true" className="size-4" />
        ウォッチリストに追加
      </ActionButton>
      <span className="text-muted-foreground text-xs">追加後にメモと優先度を管理できます</span>
    </div>
  );
}

function StockWatchlistSummary({ stock }: { stock: StockDetail }) {
  const [editing, setEditing] = useState(false);
  const watchlist = stock.watchlist;

  if (watchlist === null) {
    return null;
  }

  const item: WatchlistItem = {
    id: watchlist.id,
    memo: watchlist.memo,
    priority: watchlist.priority,
    is_active: true,
    stock,
  };

  return (
    <>
      <div className="flex max-w-2xl flex-col gap-3 rounded-md border border-border bg-muted/55 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-medium text-foreground text-sm">
              <Check aria-hidden="true" className="size-4 text-positive" />
              ウォッチリスト登録済み
            </span>
            <WatchlistPriorityBadge priority={watchlist.priority} />
          </div>
          <p className="mt-1 break-words text-muted-foreground text-sm">
            {watchlist.memo?.trim() || 'メモは未登録です'}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil aria-hidden="true" className="size-4" />
          メモを編集
        </Button>
      </div>

      {editing && (
        <WatchlistEditDialog
          item={item}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditing(false);
            }
          }}
        />
      )}
    </>
  );
}
