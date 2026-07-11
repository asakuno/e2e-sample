import { router } from '@inertiajs/react';
import { useState, useTransition } from 'react';
import { runInertiaAction } from '@/lib/inertia-actions';
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
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<NewsFilters>(initialFilters);

  const submitFilters = (nextFilters = filters) => {
    startTransition(async () => {
      await runInertiaAction(
        (visitOptions) => {
          router.get(index.url(), compactFilters(nextFilters), visitOptions);
        },
        {
          only: ['news', 'filters'],
          preserveScroll: true,
          preserveState: true,
          replace: true,
        },
      );
    });
  };

  const resetFilters = () => {
    const emptyFilters: NewsFilters = {
      article_id: '',
      stock_id: '',
      sentiment: '',
      analysis_status: '',
      from: '',
      to: '',
    };
    setFilters(emptyFilters);
    submitFilters(emptyFilters);
  };

  return (
    <NewsFilterForm
      filters={filters}
      stockOptions={stockOptions}
      sentimentOptions={sentimentOptions}
      processing={isPending}
      onFiltersChange={setFilters}
      onSubmit={submitFilters}
      onReset={resetFilters}
    />
  );
}

function compactFilters(filters: NewsFilters): Partial<NewsFilters> {
  return {
    ...(filters.article_id !== '' ? { article_id: filters.article_id } : {}),
    ...(filters.stock_id !== '' ? { stock_id: filters.stock_id } : {}),
    ...(filters.sentiment !== '' ? { sentiment: filters.sentiment } : {}),
    ...(filters.analysis_status !== '' ? { analysis_status: filters.analysis_status } : {}),
    ...(filters.from !== '' ? { from: filters.from } : {}),
    ...(filters.to !== '' ? { to: filters.to } : {}),
  };
}
