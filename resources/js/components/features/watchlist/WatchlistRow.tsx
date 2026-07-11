import { ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { ActionButton } from '@/components/ui/ActionButton';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { Button } from '@/components/ui/button';
import { show as stockShow } from '@/routes/stocks';
import type { WatchlistItem } from '@/types/watchlist';
import { WatchlistPriorityBadge } from './WatchlistPriorityBadge';

interface WatchlistRowProps {
  item: WatchlistItem;
  onEditMemo?: ((item: WatchlistItem) => void) | undefined;
  removeAction?: ((item: WatchlistItem) => Promise<void>) | undefined;
}

export function WatchlistRow({ item, onEditMemo, removeAction }: WatchlistRowProps) {
  const handleEditMemo = () => {
    if (onEditMemo == null) return;

    onEditMemo(item);
  };

  return (
    <tr className="transition-colors duration-motion-fast ease-standard hover:bg-muted/50">
      <td className="whitespace-nowrap px-4 py-4">
        <div className="font-semibold text-foreground text-sm">{item.stock.symbol}</div>
        <div className="text-muted-foreground text-xs">{item.stock.market.toUpperCase()}</div>
      </td>
      <td className="min-w-64 px-4 py-4">
        <div className="font-medium text-foreground text-sm">{item.stock.name}</div>
        <div className="text-muted-foreground text-xs">{item.stock.industry ?? '-'}</div>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <WatchlistPriorityBadge priority={item.priority} />
      </td>
      <td className="min-w-72 px-4 py-4 text-muted-foreground text-sm">
        {item.memo != null && item.memo !== '' ? item.memo : '-'}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground text-sm">
        {item.stock.sector ?? '-'}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-right">
        <div className="inline-flex items-center justify-end gap-1">
          {onEditMemo != null && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${item.stock.symbol} のメモを編集`}
              onClick={handleEditMemo}
            >
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
          )}
          {removeAction != null && (
            <ActionButton
              variant="ghost"
              size="icon-sm"
              aria-label={`${item.stock.symbol} をウォッチリストから削除`}
              action={() => removeAction(item)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </ActionButton>
          )}
          <InertiaActionLink
            href={stockShow.url(item.stock.id)}
            pendingClassName="opacity-70"
            className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-[background-color,color,transform] duration-motion-fast ease-standard hover:bg-muted hover:text-foreground active:translate-y-px focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 motion-reduce:active:translate-y-0"
          >
            詳細
            <ArrowRight aria-hidden="true" className="size-4" />
          </InertiaActionLink>
        </div>
      </td>
    </tr>
  );
}
