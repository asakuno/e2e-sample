import { ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { ActionButton } from '@/components/ui/ActionButton';
import { ActionLink } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/button';
import { visitAction } from '@/lib/inertia-actions';
import { show as stockShow } from '@/routes/stocks';
import type { WatchlistItem } from '@/types/watchlist';
import { WatchlistPriorityBadge } from './WatchlistPriorityBadge';

interface WatchlistRowProps {
  item: WatchlistItem;
  editMemoAction?: ((item: WatchlistItem) => void | Promise<void>) | undefined;
  removeAction?: ((item: WatchlistItem) => void | Promise<void>) | undefined;
}

export function WatchlistRow({ item, editMemoAction, removeAction }: WatchlistRowProps) {
  const handleEditMemo = () => {
    if (editMemoAction == null) return;

    void editMemoAction(item);
  };

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
          {editMemoAction != null && (
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
          <ActionLink
            href={stockShow.url(item.stock.id)}
            action={visitAction(stockShow.url(item.stock.id))}
            pendingClassName="opacity-70"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-gray-700 text-sm transition hover:bg-gray-100 hover:text-gray-950"
          >
            詳細
            <ArrowRight aria-hidden="true" className="size-4" />
          </ActionLink>
        </div>
      </td>
    </tr>
  );
}
