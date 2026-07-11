import type React from 'react';
import type { WatchlistItem } from '@/types/watchlist';
import { WatchlistRow } from './WatchlistRow';

interface WatchlistTableProps {
  items: WatchlistItem[];
  onEditMemo?: ((item: WatchlistItem) => void) | undefined;
  removeAction?: ((item: WatchlistItem) => Promise<void>) | undefined;
}

export function WatchlistTable({ items, onEditMemo, removeAction }: WatchlistTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <HeaderCell>コード</HeaderCell>
              <HeaderCell>企業名</HeaderCell>
              <HeaderCell>優先度</HeaderCell>
              <HeaderCell>メモ</HeaderCell>
              <HeaderCell>セクター</HeaderCell>
              <HeaderCell align="right">操作</HeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.map((item) => (
              <WatchlistRow
                key={item.id}
                item={item}
                onEditMemo={onEditMemo}
                removeAction={removeAction}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
