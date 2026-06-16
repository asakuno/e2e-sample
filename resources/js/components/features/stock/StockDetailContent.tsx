import { Link } from '@inertiajs/react';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { index, show } from '@/routes/stocks';
import type { StockDetail } from '@/types/stocks';
import { StockCompanyInfo } from './StockCompanyInfo';
import { StockDetailHeader } from './StockDetailHeader';
import { StockPriceChart } from './StockPriceChart';
import { StockPriceHistoryTable } from './StockPriceHistoryTable';

type StockDetailContentProps = {
  stock: StockDetail;
};

export function StockDetailContent({ stock }: StockDetailContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href={index.url()}
        className="inline-flex min-h-8 w-fit items-center gap-2 rounded-md px-2 py-1 font-medium text-gray-600 text-sm transition-[background-color,color,transform] hover:bg-gray-100 hover:text-gray-950 active:translate-y-px focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        銘柄一覧
      </Link>

      <StockDetailHeader stock={stock} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <BarChart3 aria-hidden="true" className="size-5 text-gray-500" />
              <h2 className="font-semibold text-gray-950 text-lg">価格履歴</h2>
            </div>
            <div className="inline-flex w-fit overflow-hidden rounded-md border border-gray-200 bg-gray-50 p-1">
              {stock.period_options.map((option) => {
                const isActive = option.value === stock.selected_period;

                return (
                  <Link
                    key={option.value}
                    href={show.url(stock.id, { query: { period: option.value } })}
                    className={`rounded px-3 py-1.5 font-medium text-sm transition ${
                      isActive
                        ? 'bg-white text-gray-950 shadow-sm'
                        : 'hover:bg-white/80 text-gray-500 hover:text-gray-900'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <StockPriceChart prices={stock.price_history} currency={stock.currency} />
          </div>
        </section>

        <StockCompanyInfo stock={stock} />
      </div>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-gray-200 border-b px-5 py-4">
          <h2 className="font-semibold text-gray-950 text-lg">価格履歴一覧</h2>
        </div>
        <div className="max-h-96 overflow-auto">
          <StockPriceHistoryTable prices={stock.price_history} currency={stock.currency} />
        </div>
      </section>
    </div>
  );
}
