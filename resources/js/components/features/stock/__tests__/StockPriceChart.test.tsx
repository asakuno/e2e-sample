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
    close: 105,
    adjusted_close: 105,
    volume: 1000,
  },
  {
    price_date: '2026-06-02',
    open: 105,
    high: 108,
    low: 90,
    close: 95,
    adjusted_close: 95,
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
        name: '2026-06-01から2026-06-02までの終値チャート',
      }),
    ).toBeInTheDocument();

    const gradientStops = container.querySelectorAll('[id="price-line"] stop');
    expect(gradientStops).toHaveLength(2);
    expect(gradientStops[0]).toHaveAttribute('stop-color', 'var(--chart-1)');
    expect(gradientStops[1]).toHaveAttribute('stop-color', 'var(--chart-2)');
  });
});
