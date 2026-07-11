import { ArrowLeft, BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { index, show } from '@/routes/stocks';
import type { StockDetail } from '@/types/stocks';
import { StockCompanyInfo } from './StockCompanyInfo';
import { StockDetailHeader } from './StockDetailHeader';
import { StockPriceChart } from './StockPriceChart';
import { StockPriceHistoryTable } from './StockPriceHistoryTable';

type StockDetailContentProps = {
  stock: StockDetail;
  children: ReactNode;
};

export function StockDetailContent({ stock, children }: StockDetailContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <InertiaActionLink
        href={index.url()}
        pendingClassName="opacity-70"
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-[background-color,color,transform] duration-motion-fast ease-standard hover:bg-muted hover:text-foreground active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        銘柄一覧
      </InertiaActionLink>

      <StockDetailHeader stock={stock} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <BarChart3 aria-hidden="true" className="size-5 text-muted-foreground" />
              <h2 className="font-semibold text-card-foreground text-lg">価格履歴</h2>
            </div>
            <div className="inline-flex w-fit overflow-hidden rounded-md border border-border bg-muted p-1">
              {stock.period_options.map((option) => {
                const isActive = option.value === stock.selected_period;

                return (
                  <InertiaActionLink
                    key={option.value}
                    href={show.url(stock.id, { query: { period: option.value } })}
                    pendingClassName="opacity-70"
                    className={`inline-flex min-h-11 items-center rounded px-3 py-2 font-medium text-sm tabular-nums transition-[background-color,color,box-shadow] duration-motion-fast ease-standard ${
                      isActive
                        ? 'bg-card text-card-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-card/80 hover:text-foreground'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {option.label}
                  </InertiaActionLink>
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

      {children}

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-border border-b px-5 py-4">
          <h2 className="font-semibold text-card-foreground text-lg">価格履歴一覧</h2>
        </div>
        <div className="max-h-96 overflow-auto">
          <StockPriceHistoryTable prices={stock.price_history} currency={stock.currency} />
        </div>
      </section>
    </div>
  );
}
