import { Head, router } from '@inertiajs/react';
import { StockTable } from '@/components/features/stock/StockTable';
import { StocksSearchPanel } from '@/components/features/stock/StocksSearchPanel';
import { Pagination } from '@/components/ui/Pagination';
import { type InertiaPageComponent, withAuthenticatedLayout } from '@/layouts/page-layouts';
import { runInertiaAction } from '@/lib/inertia-actions';
import { store as storeWatchlist } from '@/routes/watchlist';
import type { StockListItem, StocksPageProps } from '@/types/stocks';

const Stocks: InertiaPageComponent<StocksPageProps> = ({ stocks, filters, marketOptions }) => {
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
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-bold text-2xl text-foreground">銘柄検索</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              主要な米国株・日本株をコード、企業名、市場で絞り込めます。
            </p>
          </div>
          <div className="rounded-md border border-border bg-card px-3 py-2 text-muted-foreground text-sm">
            表示件数{' '}
            <span className="font-semibold text-foreground tabular-nums">{stocks.meta.total}</span>
          </div>
        </div>

        <StocksSearchPanel
          key={`${filters.q}:${filters.market}`}
          initialFilters={filters}
          marketOptions={marketOptions}
        />

        <StockTable
          stocks={stocks.data}
          marketOptions={marketOptions}
          addToWatchlistAction={handleAddToWatchlist}
        />

        <Pagination links={stocks.links} meta={stocks.meta} itemLabel="銘柄" />
      </div>
    </>
  );
};

Stocks.layout = withAuthenticatedLayout;

export default Stocks;
