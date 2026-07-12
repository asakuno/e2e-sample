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
      <div className="flex min-h-72 items-center justify-center rounded-md border border-border border-dashed bg-muted">
        <p className="text-muted-foreground text-sm">価格履歴がありません</p>
      </div>
    );
  }

  const width = 720;
  const height = 320;
  const paddingX = 28;
  const priceTop = 24;
  const priceBottom = 214;
  const volumeTop = 254;
  const volumeBottom = 296;
  const closes = chartPrices.map((price) => price.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const maxVolume = Math.max(...chartPrices.map((price) => price.volume ?? 0), 1);
  const plotWidth = width - paddingX * 2;
  const volumeSlotWidth = plotWidth / chartPrices.length;
  const volumeBarWidth = Math.max(2, Math.min(14, volumeSlotWidth * 0.7));
  const coordinates = chartPrices.map((price, index) => {
    const x =
      paddingX +
      (chartPrices.length === 1 ? plotWidth / 2 : (index / (chartPrices.length - 1)) * plotWidth);
    const y = priceBottom - ((price.close - min) / range) * (priceBottom - priceTop);

    return { x, y };
  });
  const points = coordinates.map(({ x, y }) => `${x},${y}`).join(' ');
  const first = chartPrices[0]!;
  const last = chartPrices[chartPrices.length - 1]!;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${first.price_date}から${last.price_date}までの終値と出来高チャート`}
        className="h-80 w-full"
      >
        <title>
          {first.price_date}から{last.price_date}までの終値と出来高
        </title>
        <defs>
          <linearGradient id="price-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--chart-1)" />
            <stop offset="100%" stopColor="var(--chart-2)" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = priceTop + (line / 3) * (priceBottom - priceTop);

          return (
            <line
              key={line}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              className="stroke-border"
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

          return (
            <circle
              key={price.price_date}
              cx={point.x}
              cy={point.y}
              className="fill-foreground"
              r="4"
            />
          );
        })}
        <line
          x1={paddingX}
          x2={width - paddingX}
          y1={238}
          y2={238}
          className="stroke-border"
          strokeWidth="1"
        />
        <text x={paddingX} y={250} className="fill-muted-foreground text-[11px]">
          出来高
        </text>
        {chartPrices.map((price, index) => {
          const volume = price.volume ?? 0;
          const barHeight = (volume / maxVolume) * (volumeBottom - volumeTop);
          const point = coordinates[index]!;

          return (
            <rect
              key={`volume-${price.price_date}`}
              data-volume-bar="true"
              x={point.x - volumeBarWidth / 2}
              y={volumeBottom - barHeight}
              width={volumeBarWidth}
              height={barHeight}
              rx="1"
              className="fill-chart-3"
              opacity="0.6"
            />
          );
        })}
      </svg>
      <div className="flex justify-between border-border border-t bg-card px-4 py-3 text-muted-foreground text-xs tabular-nums">
        <span>{formatShortDate(first.price_date)}</span>
        <span>
          {formatPrice(min, currency)} - {formatPrice(max, currency)}
        </span>
        <span>{formatShortDate(last.price_date)}</span>
      </div>
    </div>
  );
}
