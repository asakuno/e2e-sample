import type React from 'react';
import { ArrowRight, Check, Eye } from 'lucide-react';
import { ActionButton } from '@/components/ui/ActionButton';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import { show } from '@/routes/stocks';
import type { StockListItem, StockMarketOption } from '@/types/stocks';

interface StockTableProps {
  stocks: StockListItem[];
  marketOptions: StockMarketOption[];
  addToWatchlistAction?: ((stock: StockListItem) => Promise<void>) | undefined;
}

export function StockTable({ stocks, marketOptions, addToWatchlistAction }: StockTableProps) {
  if (stocks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center shadow-sm">
        <p className="font-medium text-card-foreground">該当する銘柄がありません</p>
        <p className="mt-2 text-muted-foreground text-sm">検索条件を変更して再度お試しください。</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
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
          <tbody className="divide-y divide-border bg-card">
            {stocks.map((stock) => (
              <StockTableRow
                key={stock.id}
                stock={stock}
                marketOptions={marketOptions}
                isInWatchlist={stock.is_in_watchlist === true}
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
    <tr className="transition-colors hover:bg-muted">
      <td className="whitespace-nowrap px-4 py-4">
        <div className="font-semibold text-foreground text-sm">{stock.symbol}</div>
        <div className="text-muted-foreground text-xs">{stock.country}</div>
      </td>
      <td className="min-w-60 px-4 py-4">
        <div className="font-medium text-foreground text-sm">{stock.name}</div>
        <div className="text-muted-foreground text-xs">{stock.industry ?? '-'}</div>
      </td>
      <td className="whitespace-nowrap px-4 py-4">
        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 font-medium text-foreground text-xs">
          {marketLabel(stock.market, marketOptions)}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground text-sm">
        {stock.exchange ?? '-'}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground text-sm">
        {stock.sector ?? '-'}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground text-sm">
        {stock.currency}
      </td>
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
            className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 py-2 font-medium text-foreground text-sm transition-[background-color,color,transform] duration-motion-fast ease-standard hover:bg-muted active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:active:translate-y-0"
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
      className={`whitespace-nowrap px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-normal ${
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
