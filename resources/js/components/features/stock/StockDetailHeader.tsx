import { TrendingDown, TrendingUp } from 'lucide-react';
import {
  formatCurrencyChange,
  formatPercent,
  formatPrice,
  formatVolume,
} from '@/lib/formatters';
import type { StockDetail } from '@/types/stocks';
import { calculatePeriodChange } from './stock-detail-presenter';

type StockDetailHeaderProps = {
  stock: StockDetail;
};

export function StockDetailHeader({ stock }: StockDetailHeaderProps) {
  const latestClose = stock.latest_price?.close ?? null;
  const periodChange = calculatePeriodChange(stock.price_history);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-3xl text-gray-950">{stock.symbol}</h1>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700 text-xs">
              {stock.market.toUpperCase()}
            </span>
          </div>
          <p className="mt-2 text-gray-700">{stock.name}</p>
          {stock.description && (
            <p className="mt-3 max-w-3xl text-gray-500 text-sm leading-6">
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
    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <dt className="text-gray-500 text-xs">{label}</dt>
      <dd
        className={`mt-1 flex items-center gap-1 font-semibold text-sm ${
          isPositive ? 'text-emerald-700' : isNegative ? 'text-red-700' : 'text-gray-950'
        }`}
      >
        {isPositive && <TrendingUp aria-hidden="true" className="size-4" />}
        {isNegative && <TrendingDown aria-hidden="true" className="size-4" />}
        {value}
      </dd>
      {subValue && <dd className="mt-0.5 text-gray-500 text-xs">{subValue}</dd>}
    </div>
  );
}
