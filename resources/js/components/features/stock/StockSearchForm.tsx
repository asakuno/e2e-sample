import type React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldLabel, fieldControlVariants } from '@/components/ui/field';
import { Surface } from '@/components/ui/surface';
import { cn } from '@/lib/utils';
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
    <Surface asChild padding="md">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_220px_auto] xl:items-end">
          <div>
            <FieldLabel htmlFor="stock-search-q">銘柄コード・企業名</FieldLabel>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground"
              />
              <input
                id="stock-search-q"
                type="search"
                value={filters.q}
                disabled={processing}
                onChange={(event) => onFiltersChange({ ...filters, q: event.target.value })}
                placeholder="AAPL, Toyota, Microsoft"
                className={cn(fieldControlVariants(), 'pr-4 pl-10')}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="stock-search-market">市場</FieldLabel>
            <select
              id="stock-search-market"
              value={filters.market}
              disabled={processing}
              onChange={(event) => onFiltersChange({ ...filters, market: event.target.value })}
              className={fieldControlVariants()}
            >
              <option value="">すべて</option>
              {marketOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 md:col-span-2 xl:col-span-1">
            <Button
              type="submit"
              className="h-11 min-w-28 flex-1 xl:flex-none"
              disabled={processing}
              aria-busy={processing || undefined}
            >
              <Search />
              {processing ? '検索中...' : '検索'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 xl:flex-none"
              disabled={processing}
              onClick={onReset}
            >
              <X />
              クリア
            </Button>
          </div>
        </div>
      </form>
    </Surface>
  );
}
