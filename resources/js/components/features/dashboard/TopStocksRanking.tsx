import type { TopStockData } from '@/types/dashboard';

interface TopStocksRankingProps {
  stocks?: TopStockData[];
}

export function TopStocksRanking({ stocks = [] }: TopStocksRankingProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-card-foreground">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-base">注目銘柄ランキング</h3>
        <span className="text-muted-foreground text-xs">signal score</span>
      </div>

      {stocks.length === 0 ? (
        <p className="text-muted-foreground text-sm">シグナルがあるウォッチ銘柄はありません</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {stocks.map((stock, index) => (
            <li key={stock.id} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground text-sm tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-sm">
                    {stock.symbol}
                    <span className="ml-2 font-normal text-muted-foreground">{stock.name}</span>
                  </p>
                  <p className="font-semibold text-primary text-sm tabular-nums">
                    {stock.totalScore.toFixed(2)}
                  </p>
                </div>
                <p className="mt-0.5 text-muted-foreground text-xs tabular-nums">
                  positive {stock.positiveCount} / negative {stock.negativeCount}
                  {stock.signalDate != null && ` / ${stock.signalDate}`}
                </p>
                {stock.reason != null && (
                  <p className="mt-1 text-muted-foreground text-sm">{stock.reason}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
