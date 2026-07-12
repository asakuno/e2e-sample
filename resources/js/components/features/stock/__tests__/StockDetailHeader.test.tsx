import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { StockDetail } from '@/types/stocks';
import { StockDetailHeader } from '../StockDetailHeader';

const stock: StockDetail = {
  id: 1,
  symbol: 'AAPL',
  name: 'Apple Inc.',
  market: 'us',
  exchange: 'NASDAQ',
  country: 'US',
  currency: 'USD',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  description: null,
  watchlist: null,
  latest_price: {
    price_date: '2026-07-10',
    open: 208,
    high: 214,
    low: 207,
    close: 210,
    adjusted_close: 210,
    volume: 2000,
  },
  price_history: [
    {
      price_date: '2026-07-09',
      open: 198,
      high: 202,
      low: 197,
      close: 200,
      adjusted_close: 200,
      volume: 1800,
    },
    {
      price_date: '2026-07-10',
      open: 208,
      high: 214,
      low: 207,
      close: 210,
      adjusted_close: 210,
      volume: 2000,
    },
  ],
  related_news: [],
  analyses: [],
  signals: [],
  selected_period: '1M',
  period_options: [{ value: '1M', label: '1M' }],
};

describe('StockDetailHeader', () => {
  it('最新価格、前日比、価格取得日とウォッチリスト操作を表示すること', () => {
    // Arrange
    const expected = {
      latestPrice: '$210.00',
      change: '+$10.00',
      percent: '+5.00%',
      acquiredDate: '2026-07-10',
      control: 'ウォッチリスト操作',
    };

    // Act
    render(
      <StockDetailHeader stock={stock} watchlistControl={<button>{expected.control}</button>} />,
    );
    const actual = {
      latestPrice: screen.getByText(expected.latestPrice).textContent,
      change: screen.getByText(expected.change).textContent,
      percent: screen.getByText(expected.percent).textContent,
      acquiredDate: screen.getByText(expected.acquiredDate).textContent,
      control: screen.getByRole('button', { name: expected.control }).textContent,
    };

    // Assert
    expect(actual).toEqual(expected);
  });
});
