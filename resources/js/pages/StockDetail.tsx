import type React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import {
  formatCurrencyChange,
  formatPercent,
  formatPrice,
  formatShortDate,
  formatVolume,
} from '@/lib/formatters';
import { index, show } from '@/routes/stocks';
import type { StockDetailPageProps, StockPricePoint } from '@/types/stocks';

export default function StockDetail({ stock }: StockDetailPageProps) {
  const latestClose = stock.latest_price?.close ?? null;
  const periodChange = calculatePeriodChange(stock.price_history);

  return (
    <>
      <Head title={`${stock.symbol} - Stocks`} />
      <AuthenticatedLayout>
        <div className="flex flex-col gap-6">
          <Link
            href={index.url()}
            className="inline-flex w-fit items-center gap-2 rounded-md px-2 py-1 font-medium text-gray-600 text-sm transition hover:bg-gray-100 hover:text-gray-950"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            銘柄一覧
          </Link>

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
                            : 'text-gray-500 hover:text-gray-900'
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
                <PriceChart prices={stock.price_history} currency={stock.currency} />
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-950 text-lg">企業情報</h2>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <InfoItem label="国" value={stock.country} />
                <InfoItem label="市場" value={stock.market.toUpperCase()} />
                <InfoItem label="取引所" value={stock.exchange ?? '-'} />
                <InfoItem label="通貨" value={stock.currency} />
                <InfoItem label="セクター" value={stock.sector ?? '-'} />
                <InfoItem label="業種" value={stock.industry ?? '-'} />
              </dl>
            </section>
          </div>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-gray-200 border-b px-5 py-4">
              <h2 className="font-semibold text-gray-950 text-lg">価格履歴一覧</h2>
            </div>
            <div className="max-h-96 overflow-auto">
              <PriceHistoryTable prices={stock.price_history} currency={stock.currency} />
            </div>
          </section>
        </div>
      </AuthenticatedLayout>
    </>
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="mt-1 font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function PriceChart({ prices, currency }: { prices: StockPricePoint[]; currency: string }) {
  const chartPrices = prices.filter(
    (price): price is StockPricePoint & { close: number } => price.close !== null,
  );

  if (chartPrices.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50">
        <p className="text-gray-500 text-sm">価格履歴がありません</p>
      </div>
    );
  }

  const width = 720;
  const height = 260;
  const paddingX = 28;
  const paddingY = 24;
  const closes = chartPrices.map((price) => price.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const coordinates = chartPrices.map((price, index) => {
    const x =
      paddingX +
      (chartPrices.length === 1
        ? (width - paddingX * 2) / 2
        : (index / (chartPrices.length - 1)) * (width - paddingX * 2));
    const y = height - paddingY - ((price.close - min) / range) * (height - paddingY * 2);

    return { x, y };
  });
  const points = coordinates.map(({ x, y }) => `${x},${y}`).join(' ');
  const first = chartPrices[0]!;
  const last = chartPrices[chartPrices.length - 1]!;

  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${first.price_date}から${last.price_date}までの終値チャート`}
        className="h-72 w-full"
      >
        <defs>
          <linearGradient id="price-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = paddingY + (line / 3) * (height - paddingY * 2);

          return (
            <line
              key={line}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}
        <polyline fill="none" points={points} stroke="url(#price-line)" strokeWidth="3" />
        {chartPrices.map((price, index) => {
          if (index !== 0 && index !== chartPrices.length - 1) {
            return null;
          }

          const point = coordinates[index]!;

          return <circle key={price.price_date} cx={point.x} cy={point.y} fill="#111827" r="4" />;
        })}
      </svg>
      <div className="flex justify-between border-gray-200 border-t bg-white px-4 py-3 text-gray-600 text-xs">
        <span>{formatShortDate(first.price_date)}</span>
        <span>
          {formatPrice(min, currency)} - {formatPrice(max, currency)}
        </span>
        <span>{formatShortDate(last.price_date)}</span>
      </div>
    </div>
  );
}

function PriceHistoryTable({ prices, currency }: { prices: StockPricePoint[]; currency: string }) {
  if (prices.length === 0) {
    return <p className="px-5 py-8 text-center text-gray-500 text-sm">価格履歴がありません</p>;
  }

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="sticky top-0 bg-gray-50">
        <tr>
          <TableHeader>日付</TableHeader>
          <TableHeader align="right">始値</TableHeader>
          <TableHeader align="right">高値</TableHeader>
          <TableHeader align="right">安値</TableHeader>
          <TableHeader align="right">終値</TableHeader>
          <TableHeader align="right">出来高</TableHeader>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {[...prices].reverse().map((price) => (
          <tr key={price.price_date} className="hover:bg-gray-50">
            <td className="whitespace-nowrap px-4 py-3 text-gray-700 text-sm">
              {price.price_date}
            </td>
            <TableCell>{formatPrice(price.open, currency)}</TableCell>
            <TableCell>{formatPrice(price.high, currency)}</TableCell>
            <TableCell>{formatPrice(price.low, currency)}</TableCell>
            <TableCell strong>{formatPrice(price.close, currency)}</TableCell>
            <TableCell>{formatVolume(price.volume)}</TableCell>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TableHeader({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-4 py-3 font-semibold text-gray-500 text-xs ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function TableCell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-3 text-right text-sm ${
        strong ? 'font-semibold text-gray-950' : 'text-gray-700'
      }`}
    >
      {children}
    </td>
  );
}

function calculatePeriodChange(
  prices: StockPricePoint[],
): { amount: number; percent: number } | null {
  const validPrices = prices.filter(
    (price): price is StockPricePoint & { close: number } => price.close !== null,
  );

  if (validPrices.length < 2) {
    return null;
  }

  const first = validPrices[0]!.close;
  const last = validPrices[validPrices.length - 1]!.close;

  return {
    amount: last - first,
    percent: first === 0 ? 0 : ((last - first) / first) * 100,
  };
}
