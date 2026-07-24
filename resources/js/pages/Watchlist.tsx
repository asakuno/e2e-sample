import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { WatchlistContent } from '@/components/features/watchlist/WatchlistContent';
import { WatchlistEditDialog } from '@/components/features/watchlist/WatchlistEditDialog';
import { Pagination } from '@/components/ui/Pagination';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { runInertiaAction } from '@/lib/inertia-actions';
import { destroy } from '@/routes/watchlist';
import type { WatchlistItem, WatchlistPageProps } from '@/types/watchlist';

export default function Watchlist({ watchlists }: WatchlistPageProps) {
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);

  const handleRemove = (item: WatchlistItem): Promise<void> => {
    return runInertiaAction(
      (visitOptions) => {
        router.delete(destroy.url(item.id), visitOptions);
      },
      { preserveScroll: true },
    );
  };

  return (
    <>
      <Head title="Watchlist" />
      <AuthenticatedLayout>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-bold text-2xl text-foreground">ウォッチリスト</h1>
              <p className="mt-1 text-muted-foreground text-sm">
                監視銘柄の優先度とメモを管理できます。
              </p>
            </div>
            <div className="rounded-md border border-border bg-card px-3 py-2 text-muted-foreground text-sm">
              登録件数{' '}
              <span className="font-semibold text-foreground tabular-nums">
                {watchlists.meta.total}
              </span>
            </div>
          </div>

          <WatchlistContent
            items={watchlists.data}
            onEditMemo={setEditingItem}
            removeAction={handleRemove}
          />

          <Pagination links={watchlists.links} meta={watchlists.meta} />

          <WatchlistEditDialog
            item={editingItem}
            open={editingItem != null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingItem(null);
              }
            }}
          />
        </div>
      </AuthenticatedLayout>
    </>
  );
}
