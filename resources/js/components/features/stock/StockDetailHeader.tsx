import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrencyChange, formatPercent, formatPrice, formatVolume } from '@/lib/formatters';
import type { StockDetail } from '@/types/stocks';
import { calculatePeriodChange } from './stock-detail-presenter';

type StockDetailHeaderProps = {
  stock: StockDetail;
};

export function StockDetailHeader({ stock }: StockDetailHeaderProps) {
  const latestClose = stock.latest_price?.close ?? null;
  const periodChange = calculatePeriodChange(stock.price_history);

  return (
    <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-3xl text-card-foreground">{stock.symbol}</h1>
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground text-xs">
              {stock.market.toUpperCase()}
            </span>
          </div>
          <p className="mt-2 text-foreground">{stock.name}</p>
          {stock.description && (
            <p className="mt-3 max-w-3xl text-muted-foreground text-sm leading-6">
              {stock.description}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-96 sm:grid-cols-3">
          <Metric label="最新価格" value={formatPrice(latestClose, stock.currency)} />
          <Metric label="出来高" value={formatVolume(stock.latest_price?.volume ?? null)} />
          <Metric
            label="期間騰落"
            value={formatCurrencyChange(periodChange?.amount ?? null, stock.currency)}
            tone={periodChange?.amount === undefined ? 'neutral' : periodChange.amount}
            subValue={formatPercent(periodChange?.percent ?? null)}
          />
        </div>
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
