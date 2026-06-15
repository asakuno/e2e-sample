import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { WatchlistItem } from '@/types/watchlist';
import { WatchlistContent } from '../WatchlistContent';

describe('WatchlistContent', () => {
  const item: WatchlistItem = {
    id: 1,
    memo: '決算前に確認',
    priority: 3,
    is_active: true,
    stock: {
      id: 10,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'us',
      exchange: 'NASDAQ',
      country: 'US',
      currency: 'USD',
      sector: 'Technology',
      industry: 'Consumer Electronics',
    },
  };

  it('items が空の場合、空状態が表示されること', () => {
    // Arrange
    const expected = '監視銘柄がありません';

    // Act
    render(<WatchlistContent items={[]} />);
    const actual = screen.getByText(expected);

    // Assert
    expect(actual).toBeInTheDocument();
  });

  it('items がある場合、ウォッチリスト銘柄が表示されること', () => {
    // Arrange
    const expected = 'AAPL';

    // Act
    render(<WatchlistContent items={[item]} />);
    const actual = screen.getByText(expected);

    // Assert
    expect(actual).toBeInTheDocument();
  });
});
