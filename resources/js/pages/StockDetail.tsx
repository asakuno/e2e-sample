import { Head } from '@inertiajs/react';
import { StockDetailContent } from '@/components/features/stock/StockDetailContent';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import type { StockDetailPageProps } from '@/types/stocks';

export default function StockDetail({ stock }: StockDetailPageProps) {
  return (
    <>
      <Head title={`${stock.symbol} - Stocks`} />
      <AuthenticatedLayout>
        <StockDetailContent stock={stock} />
      </AuthenticatedLayout>
    </>
  );
}
