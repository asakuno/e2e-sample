import type React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NewsFilters, NewsSelectOption } from '@/types/news';

interface NewsFilterFormProps {
  filters: NewsFilters;
  stockOptions: NewsSelectOption[];
  sentimentOptions: NewsSelectOption[];
  processing?: boolean;
  onFiltersChange: (filters: NewsFilters) => void;
  onSubmit: () => void;
  onReset: () => void;
}

export function NewsFilterForm({
  filters,
  stockOptions,
  sentimentOptions,
  processing = false,
  onFiltersChange,
  onSubmit,
  onReset,
}: NewsFilterFormProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_180px_160px_160px_auto] lg:items-end">
        <div>
          <label
            htmlFor="news-filter-stock"
            className="mb-2 block font-medium text-gray-700 text-sm"
          >
            銘柄
          </label>
          <select
            id="news-filter-stock"
            value={filters.stock_id}
            disabled={processing}
            onChange={(event) => onFiltersChange({ ...filters, stock_id: event.target.value })}
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm shadow-sm outline-none transition hover:border-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="">すべて</option>
            {stockOptions.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="news-filter-sentiment"
            className="mb-2 block font-medium text-gray-700 text-sm"
          >
            sentiment
          </label>
          <select
            id="news-filter-sentiment"
            value={filters.sentiment}
            disabled={processing}
            onChange={(event) => onFiltersChange({ ...filters, sentiment: event.target.value })}
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm shadow-sm outline-none transition hover:border-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="">すべて</option>
            {sentimentOptions.map((option) => (
              <option key={option.value} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="news-filter-from"
            className="mb-2 block font-medium text-gray-700 text-sm"
          >
            期間 From
          </label>
          <input
            id="news-filter-from"
            type="date"
            value={filters.from}
            disabled={processing}
            onChange={(event) => onFiltersChange({ ...filters, from: event.target.value })}
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm shadow-sm outline-none transition hover:border-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          />
        </div>

        <div>
          <label htmlFor="news-filter-to" className="mb-2 block font-medium text-gray-700 text-sm">
            期間 To
          </label>
          <input
            id="news-filter-to"
            type="date"
            value={filters.to}
            disabled={processing}
            onChange={(event) => onFiltersChange({ ...filters, to: event.target.value })}
            className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 text-sm shadow-sm outline-none transition hover:border-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            className="h-11 flex-1 lg:flex-none"
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
