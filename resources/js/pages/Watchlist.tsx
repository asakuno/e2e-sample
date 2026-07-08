import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { WatchlistContent } from '@/components/features/watchlist/WatchlistContent';
import { WatchlistEditDialog } from '@/components/features/watchlist/WatchlistEditDialog';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { destroy } from '@/routes/watchlist';
import type { WatchlistItem, WatchlistPageProps } from '@/types/watchlist';

export default function Watchlist({ watchlists }: WatchlistPageProps) {
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);

  const handleRemove = (item: WatchlistItem) => {
    return new Promise<void>((resolve) => {
      router.delete(destroy.url(item.id), {
        preserveScroll: true,
        onFinish: () => resolve(),
      });
    });
  };

  return (
    <>
      <Head title="Watchlist" />
      <AuthenticatedLayout>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-bold text-2xl text-gray-950">ウォッチリスト</h1>
              <p className="mt-1 text-gray-500 text-sm">監視銘柄の優先度とメモを管理できます。</p>
            </div>
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-600 text-sm">
              登録件数 <span className="font-semibold text-gray-950">{watchlists.length}</span>
            </div>
          </div>

          <WatchlistContent
            items={watchlists}
            editMemoAction={setEditingItem}
            removeAction={handleRemove}
          />

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
