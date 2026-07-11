import type React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldLabel, fieldControlVariants } from '@/components/ui/field';
import { Surface } from '@/components/ui/surface';
import { cn } from '@/lib/utils';
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
    <Surface asChild padding="md">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_180px_160px_160px_auto] xl:items-end">
          <div>
            <FieldLabel htmlFor="news-filter-stock">銘柄</FieldLabel>
            <select
              id="news-filter-stock"
              value={filters.stock_id}
              disabled={processing}
              onChange={(event) => onFiltersChange({ ...filters, stock_id: event.target.value })}
              className={fieldControlVariants()}
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
            <FieldLabel htmlFor="news-filter-sentiment">sentiment</FieldLabel>
            <select
              id="news-filter-sentiment"
              value={filters.sentiment}
              disabled={processing}
              onChange={(event) => onFiltersChange({ ...filters, sentiment: event.target.value })}
              className={fieldControlVariants()}
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
            <FieldLabel htmlFor="news-filter-from">期間 From</FieldLabel>
            <input
              id="news-filter-from"
              type="date"
              value={filters.from}
              disabled={processing}
              onChange={(event) => onFiltersChange({ ...filters, from: event.target.value })}
              className={cn(fieldControlVariants(), 'tabular-nums')}
            />
          </div>

          <div>
            <FieldLabel htmlFor="news-filter-to">期間 To</FieldLabel>
            <input
              id="news-filter-to"
              type="date"
              value={filters.to}
              disabled={processing}
              onChange={(event) => onFiltersChange({ ...filters, to: event.target.value })}
              className={cn(fieldControlVariants(), 'tabular-nums')}
            />
          </div>

          <div className="flex gap-2 md:col-span-2 xl:col-span-1">
            <Button
              type="submit"
              className="h-11 flex-1 xl:flex-none"
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
