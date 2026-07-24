import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { StockDetail } from '@/types/stocks';

vi.mock('@/components/features/watchlist/WatchlistEditDialog', () => ({
  WatchlistEditDialog: ({ open }: { open: boolean }) =>
    open ? <div>ウォッチリスト編集ダイアログ</div> : null,
}));

import { StockWatchlistControl } from '../StockWatchlistControl';

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
  latest_price: null,
  price_history: [],
  related_news: [],
  analyses: [],
  signals: [],
  selected_period: '1M',
  period_options: [{ value: '1M', label: '1M', available: false }],
  price_history_notice: '価格履歴がないため、期間を選択できません。',
};

describe('StockWatchlistControl', () => {
  it('未登録銘柄の追加ボタンを押すと追加actionを実行すること', async () => {
    // Arrange
    const addAction = vi.fn(async () => {});
    const user = userEvent.setup();
    render(<StockWatchlistControl stock={stock} addAction={addAction} />);

    // Act
    await user.click(screen.getByRole('button', { name: 'AAPL をウォッチリストに追加' }));

    // Assert
    const expected = 1;
    await waitFor(() => {
      const actual = addAction.mock.calls.length;
      expect(actual).toBe(expected);
    });
  });

  it('登録済み銘柄は優先度とメモを表示すること', () => {
    // Arrange
    const registeredStock: StockDetail = {
      ...stock,
      watchlist: { id: 9, memo: '決算発表前に確認', priority: 3 },
    };
    const expected = {
      status: 'ウォッチリスト登録済み',
      memo: '決算発表前に確認',
      priority: '高',
    };

    // Act
    render(<StockWatchlistControl stock={registeredStock} addAction={vi.fn()} />);
    const actual = {
      status: screen.getByText(expected.status).textContent,
      memo: screen.getByText(expected.memo).textContent,
      priority: screen.getByText(expected.priority).textContent,
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('登録済み銘柄の編集ボタンを押すと既存編集ダイアログを開くこと', async () => {
    // Arrange
    const registeredStock: StockDetail = {
      ...stock,
      watchlist: { id: 9, memo: null, priority: 2 },
    };
    const user = userEvent.setup();
    const expected = 'ウォッチリスト編集ダイアログ';
    render(<StockWatchlistControl stock={registeredStock} addAction={vi.fn()} />);

    // Act
    await user.click(screen.getByRole('button', { name: 'メモを編集' }));
    const actual = screen.getByText(expected).textContent;

    // Assert
    expect(actual).toBe(expected);
  });
});
