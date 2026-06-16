import type React from 'react';
import { formatPrice, formatVolume } from '@/lib/formatters';
import type { StockPricePoint } from '@/types/stocks';

type StockPriceHistoryTableProps = {
  prices: StockPricePoint[];
  currency: string;
};

export function StockPriceHistoryTable({ prices, currency }: StockPriceHistoryTableProps) {
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
