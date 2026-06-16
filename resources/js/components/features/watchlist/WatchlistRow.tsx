import { Link } from '@inertiajs/react';
import { ArrowRight, Pencil, Trash2 } from 'lucide-react';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { show as stockShow } from '@/routes/stocks';
import type { WatchlistItem } from '@/types/watchlist';
import { WatchlistPriorityBadge } from './WatchlistPriorityBadge';

interface WatchlistRowProps {
  item: WatchlistItem;
  editMemoAction?: ((item: WatchlistItem) => void | Promise<void>) | undefined;
  removeAction?: ((item: WatchlistItem) => void | Promise<void>) | undefined;
}

export function WatchlistRow({ item, editMemoAction, removeAction }: WatchlistRowProps) {
  const [isEditPending, startEditTransition] = useTransition();
  const [isRemovePending, startRemoveTransition] = useTransition();

  const handleEditMemo = () => {
    if (editMemoAction == null) return;

    startEditTransition(async () => {
      await editMemoAction(item);
    });
  };

  const handleRemove = () => {
    if (removeAction == null) return;

    startRemoveTransition(async () => {
      await removeAction(item);
    });
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
              aria-busy={isEditPending || undefined}
              disabled={isEditPending}
              onClick={handleEditMemo}
            >
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
          )}
          {removeAction != null && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${item.stock.symbol} をウォッチリストから削除`}
              aria-busy={isRemovePending || undefined}
              disabled={isRemovePending}
              onClick={handleRemove}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          )}
          <Link
            href={stockShow.url(item.stock.id)}
            className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 py-1 font-medium text-gray-700 text-sm transition-[background-color,color,transform] hover:bg-gray-100 hover:text-gray-950 active:translate-y-px focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
          >
            詳細
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
