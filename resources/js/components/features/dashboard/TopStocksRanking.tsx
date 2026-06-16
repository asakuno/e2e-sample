import type { TopStockData } from '@/types/dashboard';

interface TopStocksRankingProps {
  stocks?: TopStockData[];
}

export function TopStocksRanking({ stocks = [] }: TopStocksRankingProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-base text-gray-900">注目銘柄ランキング</h3>
        <span className="text-gray-400 text-xs">signal score</span>
      </div>

      {stocks.length === 0 ? (
        <p className="text-gray-500 text-sm">シグナルがあるウォッチ銘柄はありません</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {stocks.map((stock, index) => (
            <li key={stock.id} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700 text-sm">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-gray-900 text-sm">
                    {stock.symbol}
                    <span className="ml-2 font-normal text-gray-500">{stock.name}</span>
                  </p>
                  <p className="font-semibold text-blue-600 text-sm">
                    {stock.totalScore.toFixed(2)}
                  </p>
                </div>
                <p className="mt-0.5 text-gray-500 text-xs">
                  positive {stock.positiveCount} / negative {stock.negativeCount}
                  {stock.signalDate != null && ` / ${stock.signalDate}`}
                </p>
                {stock.reason != null && (
                  <p className="mt-1 text-gray-500 text-sm">{stock.reason}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
