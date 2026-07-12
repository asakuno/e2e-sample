import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { StockPricePoint } from '@/types/stocks';
import { StockPriceHistoryTable } from '../StockPriceHistoryTable';

describe('StockPriceHistoryTable', () => {
  it('調整後終値がある場合は価格履歴の終値に使用すること', () => {
    // Arrange
    const prices: StockPricePoint[] = [
      {
        price_date: '2026-07-10',
        open: 208,
        high: 214,
        low: 207,
        close: 210,
        adjusted_close: 105,
        effective_close: 105,
        volume: 2000,
      },
    ];
    const expected = '$105.00';

    // Act
    render(<StockPriceHistoryTable prices={prices} currency="USD" />);
    const actual = screen.getByText(expected).textContent;

    // Assert
    expect(actual).toBe(expected);
  });
});
