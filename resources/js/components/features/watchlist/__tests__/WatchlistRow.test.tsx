import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { WatchlistItem } from '@/types/watchlist';
import { WatchlistRow } from '../WatchlistRow';

describe('WatchlistRow', () => {
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

  it('銘柄名とメモが表示されること', () => {
    // Arrange
    const expected = {
      name: 'Apple Inc.',
      memo: '決算前に確認',
    };

    // Act
    render(
      <table>
        <tbody>
          <WatchlistRow item={item} />
        </tbody>
      </table>,
    );
    const actual = {
      name: screen.getByText(expected.name).textContent,
      memo: screen.getByText(expected.memo).textContent,
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('メモ編集ボタンを押した場合、onEditMemo が呼ばれること', () => {
    // Arrange
    const onEditMemo = vi.fn();
    const expected = 1;

    // Act
    render(
      <table>
        <tbody>
          <WatchlistRow item={item} onEditMemo={onEditMemo} />
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'AAPL のメモを編集' }));
    const actual = onEditMemo.mock.calls.length;

    // Assert
    expect(actual).toBe(expected);
  });

  it('削除ボタンを押した場合、onRemove が呼ばれること', () => {
    // Arrange
    const onRemove = vi.fn();
    const expected = 1;

    // Act
    render(
      <table>
        <tbody>
          <WatchlistRow item={item} onRemove={onRemove} />
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'AAPL をウォッチリストから削除' }));
    const actual = onRemove.mock.calls.length;

    // Assert
    expect(actual).toBe(expected);
  });
});
