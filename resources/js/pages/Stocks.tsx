import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { StockSearchForm } from '@/components/features/stock-app/StockSearchForm';
import { StockTable } from '@/components/features/stock-app/StockTable';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { index } from '@/routes/stocks';
import type { StockFilters, StocksPageProps } from '@/types/stocks';

export default function Stocks({ stocks, filters, marketOptions }: StocksPageProps) {
  const [searchFilters, setSearchFilters] = useState<StockFilters>(filters);

  useEffect(() => {
    setSearchFilters(filters);
  }, [filters]);

  const submitSearch = (nextFilters = searchFilters) => {
    router.get(index.url(), compactFilters(nextFilters), {
      only: ['stocks', 'filters'],
      preserveScroll: true,
      preserveState: true,
      replace: true,
    });
  };

  const resetSearch = () => {
    const emptyFilters = { q: '', market: '' };
    setSearchFilters(emptyFilters);
    submitSearch(emptyFilters);
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

          <StockSearchForm
            filters={searchFilters}
            marketOptions={marketOptions}
            onFiltersChange={setSearchFilters}
            onSubmit={submitSearch}
            onReset={resetSearch}
          />

          <StockTable stocks={stocks} marketOptions={marketOptions} />
        </div>
      </AuthenticatedLayout>
    </>
  );
}

function compactFilters(filters: StockFilters): Partial<StockFilters> {
  return {
    ...(filters.q.trim() !== '' ? { q: filters.q.trim() } : {}),
    ...(filters.market !== '' ? { market: filters.market } : {}),
  };
}
