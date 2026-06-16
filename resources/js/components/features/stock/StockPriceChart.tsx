import { formatPrice, formatShortDate } from '@/lib/formatters';
import type { StockPricePoint } from '@/types/stocks';

type StockPriceChartProps = {
  prices: StockPricePoint[];
  currency: string;
};

export function StockPriceChart({ prices, currency }: StockPriceChartProps) {
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
