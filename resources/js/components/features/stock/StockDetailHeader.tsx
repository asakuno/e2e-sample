import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatCurrencyChange, formatPercent, formatPrice, formatVolume } from '@/lib/formatters';
import type { StockDetail } from '@/types/stocks';
import { calculatePreviousDayChange } from './stock-detail-presenter';

type StockDetailHeaderProps = {
  stock: StockDetail;
  watchlistControl?: ReactNode;
};

export function StockDetailHeader({ stock, watchlistControl }: StockDetailHeaderProps) {
  const latestClose = stock.latest_price?.effective_close ?? null;
  const previousDayChange = calculatePreviousDayChange(stock.latest_price, stock.price_history);

  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-3xl text-card-foreground">{stock.symbol}</h1>
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground text-xs">
              {stock.market.toUpperCase()}
            </span>
          </div>
          <p className="mt-2 text-foreground">{stock.name}</p>
          {watchlistControl !== undefined && <div className="mt-4">{watchlistControl}</div>}
        </div>
        <dl className="grid grid-cols-2 gap-3 lg:min-w-[32rem] lg:grid-cols-4">
          <Metric label="最新価格" value={formatPrice(latestClose, stock.currency)} />
          <Metric
            label="前日比"
            value={formatCurrencyChange(previousDayChange?.amount ?? null, stock.currency)}
            tone={previousDayChange?.amount ?? 'neutral'}
            subValue={formatPercent(previousDayChange?.percent ?? null)}
          />
          <Metric label="価格取得日" value={stock.latest_price?.price_date ?? '-'} />
          <Metric label="出来高" value={formatVolume(stock.latest_price?.volume ?? null)} />
        </dl>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  subValue,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  subValue?: string;
  tone?: number | 'neutral';
}) {
  const isPositive = typeof tone === 'number' && tone > 0;
  const isNegative = typeof tone === 'number' && tone < 0;

  return (
    <div className="rounded-md border border-border bg-muted px-3 py-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd
        className={`mt-1 flex items-center gap-1 font-semibold text-sm tabular-nums ${
          isPositive ? 'text-positive' : isNegative ? 'text-negative' : 'text-foreground'
        }`}
      >
        {isPositive && <TrendingUp aria-hidden="true" className="size-4" />}
        {isNegative && <TrendingDown aria-hidden="true" className="size-4" />}
        {value}
      </dd>
      {subValue && (
        <dd className="mt-0.5 text-muted-foreground text-xs tabular-nums">{subValue}</dd>
      )}
    </div>
  );
}
