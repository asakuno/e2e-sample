import { Head, router } from '@inertiajs/react';
import { StockTable } from '@/components/features/stock/StockTable';
import { StocksSearchPanel } from '@/components/features/stock/StocksSearchPanel';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { runInertiaAction } from '@/lib/inertia-actions';
import { store as storeWatchlist } from '@/routes/watchlist';
import type { StockListItem, StocksPageProps } from '@/types/stocks';

export default function Stocks({
  stocks,
  filters,
  marketOptions,
  watchlistedStockIds,
}: StocksPageProps) {
  const handleAddToWatchlist = (stock: StockListItem): Promise<void> => {
    return runInertiaAction(
      (visitOptions) => {
        router.post(
          storeWatchlist.url(),
          {
            stock_id: stock.id,
            memo: '',
            priority: 2,
          },
          visitOptions,
        );
      },
      { preserveScroll: true },
    );
  };

  return (
    <>
      <Head title="Stocks" />
      <AuthenticatedLayout>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-bold text-2xl text-gray-950">銘柄検索</h1>
              <p className="mt-1 text-gray-500 text-sm">
                主要な米国株・日本株をコード、企業名、市場で絞り込めます。
              </p>
            </div>
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-600 text-sm">
              表示件数 <span className="font-semibold text-gray-950">{stocks.length}</span>
            </div>
          </div>

          <StocksSearchPanel
            key={`${filters.q}:${filters.market}`}
            initialFilters={filters}
            marketOptions={marketOptions}
          />

          <StockTable
            stocks={stocks}
            marketOptions={marketOptions}
            watchlistedStockIds={watchlistedStockIds}
            addToWatchlistAction={handleAddToWatchlist}
          />
        </div>
      </AuthenticatedLayout>
    </>
  );
}
