import { router } from '@inertiajs/react';
import { useState } from 'react';
import { index } from '@/routes/news';
import type { NewsFilters, NewsSelectOption } from '@/types/news';
import { NewsFilterForm } from './NewsFilterForm';

interface NewsFiltersPanelProps {
  initialFilters: NewsFilters;
  stockOptions: NewsSelectOption[];
  sentimentOptions: NewsSelectOption[];
}

export function NewsFiltersPanel({
  initialFilters,
  stockOptions,
  sentimentOptions,
}: NewsFiltersPanelProps) {
  const [filters, setFilters] = useState<NewsFilters>(initialFilters);

  const submitFilters = (nextFilters = filters) => {
    router.get(index.url(), compactFilters(nextFilters), {
      only: ['news', 'filters'],
      preserveScroll: true,
      preserveState: true,
      replace: true,
    });
  };

  const resetFilters = () => {
    const emptyFilters = { stock_id: '', sentiment: '', from: '', to: '' };
    setFilters(emptyFilters);
    submitFilters(emptyFilters);
  };

  return (
    <NewsFilterForm
      filters={filters}
      stockOptions={stockOptions}
      sentimentOptions={sentimentOptions}
      onFiltersChange={setFilters}
      onSubmit={submitFilters}
      onReset={resetFilters}
    />
  );
}

function compactFilters(filters: NewsFilters): Partial<NewsFilters> {
  return {
    ...(filters.stock_id !== '' ? { stock_id: filters.stock_id } : {}),
    ...(filters.sentiment !== '' ? { sentiment: filters.sentiment } : {}),
    ...(filters.from !== '' ? { from: filters.from } : {}),
    ...(filters.to !== '' ? { to: filters.to } : {}),
  };
}
