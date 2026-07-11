import type React from 'react';
import { ArrowRight, Check, Eye } from 'lucide-react';
import { ActionButton } from '@/components/ui/ActionButton';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { show } from '@/routes/stocks';
import type { StockListItem, StockMarketOption } from '@/types/stocks';

interface StockTableProps {
  stocks: StockListItem[];
  marketOptions: StockMarketOption[];
  watchlistedStockIds?: number[];
  addToWatchlistAction?: ((stock: StockListItem) => Promise<void>) | undefined;
}

export function StockTable({
  stocks,
  marketOptions,
  watchlistedStockIds = [],
  addToWatchlistAction,
}: StockTableProps) {
  if (stocks.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="font-medium text-gray-900">該当する銘柄がありません</p>
        <p className="mt-2 text-gray-500 text-sm">検索条件を変更して再度お試しください。</p>
      </div>
    );
  }

  const watchlistedStockIdSet = new Set(watchlistedStockIds);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <HeaderCell>コード</HeaderCell>
              <HeaderCell>企業名</HeaderCell>
              <HeaderCell>市場</HeaderCell>
              <HeaderCell>取引所</HeaderCell>
              <HeaderCell>セクター</HeaderCell>
              <HeaderCell>通貨</HeaderCell>
              <HeaderCell align="right">操作</HeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {stocks.map((stock) => (
              <StockTableRow
                key={stock.id}
                stock={stock}
                marketOptions={marketOptions}
                isInWatchlist={
                  watchlistedStockIdSet.has(stock.id) || stock.is_in_watchlist === true
                }
                addToWatchlistAction={addToWatchlistAction}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockTableRow({
  stock,
  marketOptions,
  isInWatchlist,
  addToWatchlistAction,
}: {
  stock: StockListItem;
  marketOptions: StockMarketOption[];
  isInWatchlist: boolean;
  addToWatchlistAction?: ((stock: StockListItem) => Promise<void>) | undefined;
}) {
  return (
    <tr className="transition hover:bg-gray-50">
      <td className="whitespace-nowrap px-4 py-4">
        <div className="font-semibold text-gray-900 text-sm">{stock.symbol}</div>
        <div className="text-gray-500 text-xs">{stock.country}</div>
      </td>
      <td className="min-w-60 px-4 py-4">
        <div className="font-medium text-gray-900 text-sm">{stock.name}</div>
        <div className="text-gray-500 text-xs">{stock.industry ?? '-'}</div>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700 text-xs">
          {marketLabel(stock.market, marketOptions)}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-gray-600 text-sm">{stock.exchange ?? '-'}</td>
      <td className="whitespace-nowrap px-4 py-4 text-gray-600 text-sm">{stock.sector ?? '-'}</td>
      <td className="whitespace-nowrap px-4 py-4 text-gray-600 text-sm">{stock.currency}</td>
      <td className="whitespace-nowrap px-4 py-4 text-right">
        <div className="inline-flex items-center justify-end gap-1">
          {addToWatchlistAction != null && (
            <ActionButton
              variant="outline"
              size="sm"
              aria-label={
                isInWatchlist
                  ? `${stock.symbol} はウォッチリストに追加済み`
                  : `${stock.symbol} をウォッチリストに追加`
              }
              disabled={isInWatchlist}
              action={() => addToWatchlistAction(stock)}
            >
              {isInWatchlist ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
              {isInWatchlist ? '追加済み' : '追加'}
            </ActionButton>
          )}
          <InertiaActionLink
            href={show.url(stock.id)}
            pendingClassName="opacity-70"
            className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 py-1 font-medium text-gray-700 text-sm transition-[background-color,color,transform] hover:bg-gray-100 hover:text-gray-950 active:translate-y-px focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
          >
            開く
            <ArrowRight aria-hidden="true" className="size-4" />
          </InertiaActionLink>
        </div>
      </td>
    </tr>
  );
}

function HeaderCell({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-normal ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function marketLabel(market: string, options: StockMarketOption[]): string {
  return options.find((option) => option.value === market)?.label ?? market.toUpperCase();
}
