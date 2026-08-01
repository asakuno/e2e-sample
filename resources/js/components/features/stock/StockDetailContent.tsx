import { ArrowLeft, BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import { index, show } from '@/routes/stocks';
import type { StockDetail } from '@/types/stocks';
import { StockCompanyInfo } from './StockCompanyInfo';
import { StockDetailHeader } from './StockDetailHeader';
import { StockPriceChart } from './StockPriceChart';
import { StockPriceHistoryTable } from './StockPriceHistoryTable';

type StockDetailContentProps = {
  stock: StockDetail;
  children: ReactNode;
  watchlistControl?: ReactNode;
};

export function StockDetailContent({ stock, children, watchlistControl }: StockDetailContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href={index.url()}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-[background-color,color,transform] duration-motion-fast ease-standard hover:bg-muted hover:text-foreground active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:active:translate-y-0 data-[loading]:opacity-70"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        銘柄一覧
      </Link>

      <StockDetailHeader stock={stock} watchlistControl={watchlistControl} />

      {children}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <BarChart3 aria-hidden="true" className="size-5 text-muted-foreground" />
              <h2 className="font-semibold text-card-foreground text-lg">価格・出来高推移</h2>
            </div>
            <div className="inline-flex w-fit overflow-hidden rounded-md border border-border bg-muted p-1">
              {stock.period_options.map((option) => {
                const isActive = option.value === stock.selected_period;
                const className = `inline-flex min-h-11 items-center rounded px-3 py-2 font-medium text-sm tabular-nums transition-[background-color,color,box-shadow,opacity] duration-motion-fast ease-standard data-[loading]:opacity-70 ${
                  isActive
                    ? 'bg-card text-card-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-card/80 hover:text-foreground'
                }`;

                if (!option.available) {
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`${className} cursor-not-allowed opacity-45`}
                      aria-label={`${option.label}（価格履歴不足）`}
                      aria-current={isActive ? 'page' : undefined}
                      disabled
                    >
                      {option.label}
                    </button>
                  );
                }

                return (
                  <Link
                    key={option.value}
                    href={show.url(stock.id, { query: { period: option.value } })}
                    className={className}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {stock.price_history_notice !== null && (
            <p
              role="status"
              className="mt-4 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-foreground text-sm"
            >
              {stock.price_history_notice}
            </p>
          )}

          <div className="mt-5">
            <StockPriceChart prices={stock.price_history} currency={stock.currency} />
          </div>
        </section>

        <StockCompanyInfo stock={stock} />
      </div>

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
