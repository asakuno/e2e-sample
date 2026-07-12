import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { StockPricePoint } from '@/types/stocks';
import { StockPriceChart } from '../StockPriceChart';

const prices: StockPricePoint[] = [
  {
    price_date: '2026-06-01',
    open: 100,
    high: 110,
    low: 95,
    close: 210,
    adjusted_close: 105,
    effective_close: 105,
    volume: 1000,
  },
  {
    price_date: '2026-06-02',
    open: 105,
    high: 108,
    low: 90,
    close: 190,
    adjusted_close: 95,
    effective_close: 95,
    volume: 1200,
  },
];

describe('StockPriceChart', () => {
  it('値動きの方向を決めつけないチャート色を使用すること', () => {
    // Arrange & Act
    const { container } = render(<StockPriceChart prices={prices} currency="USD" />);

    // Assert
    expect(
      screen.getByRole('img', {
        name: '2026-06-01から2026-06-02までの終値と出来高チャート',
      }),
    ).toBeInTheDocument();

    const gradientStops = container.querySelectorAll('[id="price-line"] stop');
    expect(gradientStops).toHaveLength(2);
    expect(gradientStops[0]).toHaveAttribute('stop-color', 'var(--chart-1)');
    expect(gradientStops[1]).toHaveAttribute('stop-color', 'var(--chart-2)');
  });

  it('価格データごとの出来高バーを表示すること', () => {
    // Arrange
    const expected = prices.length;

    // Act
    const { container } = render(<StockPriceChart prices={prices} currency="USD" />);
    const actual = container.querySelectorAll('[data-volume-bar="true"]').length;

    // Assert
    expect(actual).toBe(expected);
  });

  it('通常終値と調整後終値が異なる場合は調整後終値を価格範囲に使用すること', () => {
    // Arrange
    const expected = '$95.00 - $105.00';

    // Act
    render(<StockPriceChart prices={prices} currency="USD" />);
    const actual = screen.getByText(expected).textContent;

    // Assert
    expect(actual).toBe(expected);
  });
});
