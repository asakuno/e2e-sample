import { router } from '@inertiajs/react';
import { useState, useTransition } from 'react';
import { index } from '@/routes/stocks';
import type { StockFilters, StocksPageProps } from '@/types/stocks';
import { StockSearchForm } from './StockSearchForm';

type StocksSearchPanelProps = {
  initialFilters: StockFilters;
  marketOptions: StocksPageProps['marketOptions'];
};

export function StocksSearchPanel({ initialFilters, marketOptions }: StocksSearchPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [searchFilters, setSearchFilters] = useState<StockFilters>(initialFilters);

  const submitSearch = (nextFilters = searchFilters) => {
    startTransition(async () => {
      await new Promise<void>((resolve) => {
        router.get(index.url(), compactFilters(nextFilters), {
          only: ['stocks', 'filters'],
          preserveScroll: true,
          preserveState: true,
          replace: true,
          onFinish: () => resolve(),
        });
      });
    });
  };

  const resetSearch = () => {
    const emptyFilters = { q: '', market: '' };
    setSearchFilters(emptyFilters);
    submitSearch(emptyFilters);
  };

  return (
    <StockSearchForm
      filters={searchFilters}
      marketOptions={marketOptions}
      processing={isPending}
      onFiltersChange={setSearchFilters}
      onSubmit={submitSearch}
      onReset={resetSearch}
    />
  );
}

function compactFilters(filters: StockFilters): Partial<StockFilters> {
  return {
    ...(filters.q.trim() !== '' ? { q: filters.q.trim() } : {}),
    ...(filters.market !== '' ? { market: filters.market } : {}),
  };
}
