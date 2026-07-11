import type React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StockFilters, StockMarketOption } from '@/types/stocks';

interface StockSearchFormProps {
  filters: StockFilters;
  marketOptions: StockMarketOption[];
  processing?: boolean;
  onFiltersChange: (filters: StockFilters) => void;
  onSubmit: () => void;
  onReset: () => void;
}

export function StockSearchForm({
  filters,
  marketOptions,
  processing = false,
  onFiltersChange,
  onSubmit,
  onReset,
}: StockSearchFormProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
        <div>
          <label htmlFor="stock-search-q" className="mb-2 block font-medium text-gray-700 text-sm">
            銘柄コード・企業名
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-gray-400"
            />
            <input
              id="stock-search-q"
              type="search"
              value={filters.q}
              onChange={(event) => onFiltersChange({ ...filters, q: event.target.value })}
              placeholder="AAPL, Toyota, Microsoft"
              className="h-11 w-full rounded-md border border-gray-300 bg-white pr-4 pl-10 text-gray-900 text-sm shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="stock-search-market"
            className="mb-2 block font-medium text-gray-700 text-sm"
          >
            市場
          </label>
          <select
            id="stock-search-market"
            value={filters.market}
            onChange={(event) => onFiltersChange({ ...filters, market: event.target.value })}
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="">すべて</option>
            {marketOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            className="h-11 min-w-28 flex-1 lg:flex-none"
            disabled={processing}
            aria-busy={processing || undefined}
          >
            <Search />
            {processing ? '検索中...' : '検索'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 lg:flex-none"
            disabled={processing}
            onClick={onReset}
          >
            <X />
            クリア
          </Button>
        </div>
      </div>
    </form>
  );
}
