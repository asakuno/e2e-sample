import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { StockPricePoint } from '@/types/stocks';
import { StockPriceHistoryTable } from '../StockPriceHistoryTable';

describe('StockPriceHistoryTable', () => {
  it('通常終値と調整後終値を別の列に表示すること', () => {
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
    const expected = {
      close: '$210.00',
      adjustedClose: '$105.00',
    };

    // Act
    render(<StockPriceHistoryTable prices={prices} currency="USD" />);
    const actual = {
      close: screen.getByText(expected.close).textContent,
      adjustedClose: screen.getByText(expected.adjustedClose).textContent,
    };

    // Assert
    expect(actual).toEqual(expected);
  });
});
