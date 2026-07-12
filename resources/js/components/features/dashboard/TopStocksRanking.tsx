import { ArrowRight } from 'lucide-react';
import { SentimentBadge } from '@/components/features/news/SentimentBadge';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { show as stockShow } from '@/routes/stocks';
import type { TopStockData } from '@/types/dashboard';

interface TopStocksRankingProps {
  stocks?: TopStockData[];
}

export function TopStocksRanking({ stocks = [] }: TopStocksRankingProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-base">注目銘柄ランキング</h3>
        <span className="text-muted-foreground text-xs">最新シグナル順</span>
      </div>

      {stocks.length === 0 ? <TopStocksEmptyState /> : <TopStocksList stocks={stocks} />}
    </div>
  );
}

function TopStocksEmptyState() {
  return <p className="text-muted-foreground text-sm">シグナルがあるウォッチ銘柄はありません</p>;
}

function TopStocksList({ stocks }: { stocks: TopStockData[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {stocks.map((stock, index) => (
        <li key={stock.id}>
          <TopStockLink stock={stock} rank={index + 1} />
        </li>
      ))}
    </ol>
  );
}

function TopStockLink({ stock, rank }: { stock: TopStockData; rank: number }) {
  return (
    <InertiaActionLink
      href={stockShow.url(stock.id)}
      pendingClassName="opacity-70"
      aria-label={`${rank}位 ${stock.symbol} ${stock.name} の銘柄詳細を見る`}
      className="group grid min-h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-transparent p-3 transition-[background-color,border-color,transform] duration-motion-fast ease-standard hover:border-border hover:bg-muted/60 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:translate-y-0"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-sm tabular-nums">
        {rank}
      </span>

      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="min-w-0">
            <span className="font-semibold text-foreground text-sm">{stock.symbol}</span>
            <span className="ml-2 break-words text-muted-foreground text-xs">{stock.name}</span>
          </span>
          <span className="text-muted-foreground text-xs">{stock.market.toUpperCase()}</span>
        </span>

        <span className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StockMetric label="最新値" value={formatLatestPrice(stock.latestPrice)} />
          <StockMetric
            label="前日比"
            value={formatChangePercent(stock.changePercent)}
            valueClassName={changePercentClassName(stock.changePercent)}
          />
          <StockMetric
            label="シグナル"
            value={formatSignalScore(stock.totalScore)}
            valueClassName={signalScoreClassName(stock.totalScore)}
            className="col-span-2 sm:col-span-1"
          />
        </span>

        <span className="mt-3 flex flex-wrap items-center gap-2">
          <StockSentiment stock={stock} />
          <StatusBadge variant="neutral">
            材料 +{stock.positiveCount} / −{stock.negativeCount}
          </StatusBadge>
        </span>

        {stock.reason !== null && stock.reason.trim() !== '' ? (
          <span className="mt-2 line-clamp-2 block text-muted-foreground text-sm leading-5">
            {stock.reason}
          </span>
        ) : null}

        <span className="mt-2 block text-muted-foreground text-xs tabular-nums">
          {stock.updatedAt === null ? (
            '更新日時不明'
          ) : (
            <time dateTime={stock.updatedAt.replace(' ', 'T')}>更新 {stock.updatedAt}</time>
          )}
        </span>
      </span>

      <ArrowRight
        aria-hidden="true"
        className="mt-1 size-4 text-muted-foreground transition-transform duration-motion-fast ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      />
    </InertiaActionLink>
  );
}

function StockMetric({
  label,
  value,
  valueClassName,
  className,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="block text-muted-foreground text-xs">{label}</span>
      <span
        className={cn(
          'mt-0.5 block font-semibold text-foreground text-sm tabular-nums',
          valueClassName,
        )}
      >
        {value}
      </span>
    </span>
  );
}

function StockSentiment({ stock }: { stock: TopStockData }) {
  if (stock.sentiment === null || stock.sentimentLabel === null) {
    return <StatusBadge variant="neutral">センチメント未分析</StatusBadge>;
  }

  return <SentimentBadge sentiment={stock.sentiment} label={stock.sentimentLabel} />;
}

function formatLatestPrice(value: number | null): string {
  if (value === null) {
    return '未取得';
  }

  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChangePercent(value: number | null): string {
  if (value === null) {
    return '未算出';
  }

  if (value > 0) {
    return `+${value.toFixed(2)}%`;
  }

  if (value < 0) {
    return `−${Math.abs(value).toFixed(2)}%`;
  }

  return '0.00%';
}

function formatSignalScore(value: number): string {
  if (value > 0) {
    return `+${value.toFixed(2)}`;
  }

  if (value < 0) {
    return `−${Math.abs(value).toFixed(2)}`;
  }

  return '0.00';
}

function changePercentClassName(value: number | null): string {
  if (value === null || value === 0) {
    return 'text-foreground';
  }

  return value > 0 ? 'text-positive' : 'text-negative';
}

function signalScoreClassName(value: number): string {
  if (value === 0) {
    return 'text-foreground';
  }

  return value > 0 ? 'text-positive' : 'text-negative';
}
