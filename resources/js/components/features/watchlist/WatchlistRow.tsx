import { Link } from '@inertiajs/react';
import { ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { show as stockShow } from '@/routes/stocks';
import type { WatchlistItem } from '@/types/watchlist';
import { WatchlistPriorityBadge } from './WatchlistPriorityBadge';

interface WatchlistRowProps {
  item: WatchlistItem;
  onEditMemo?: ((item: WatchlistItem) => void) | undefined;
  onRemove?: ((item: WatchlistItem) => void) | undefined;
}

export function WatchlistRow({ item, onEditMemo, onRemove }: WatchlistRowProps) {
  return (
    <tr className="transition hover:bg-gray-50">
      <td className="whitespace-nowrap px-4 py-4">
        <div className="font-semibold text-gray-900 text-sm">{item.stock.symbol}</div>
        <div className="text-gray-500 text-xs">{item.stock.market.toUpperCase()}</div>
      </td>
      <td className="min-w-64 px-4 py-4">
        <div className="font-medium text-gray-900 text-sm">{item.stock.name}</div>
        <div className="text-gray-500 text-xs">{item.stock.industry ?? '-'}</div>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <WatchlistPriorityBadge priority={item.priority} />
      </td>
      <td className="min-w-72 px-4 py-4 text-gray-600 text-sm">
        {item.memo != null && item.memo !== '' ? item.memo : '-'}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-gray-600 text-sm">
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
              onClick={() => onEditMemo(item)}
            >
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
          )}
          {onRemove != null && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${item.stock.symbol} をウォッチリストから削除`}
              onClick={() => onRemove(item)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          )}
          <Link
            href={stockShow.url(item.stock.id)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-gray-700 text-sm transition hover:bg-gray-100 hover:text-gray-950"
          >
            詳細
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
