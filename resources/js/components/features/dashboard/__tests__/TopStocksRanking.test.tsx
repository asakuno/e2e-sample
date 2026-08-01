import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { TopStockData } from '@/types/dashboard';
import { TopStocksRanking } from '../TopStocksRanking';

vi.mock('@inertiajs/react', () => ({
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  router: { visit: vi.fn() },
}));

describe('TopStocksRanking', () => {
  const stocks: TopStockData[] = [
    {
      id: 1,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'us',
      totalScore: 8.25,
      latestPrice: 182.5,
      changePercent: 2.35,
      sentiment: 1,
      sentimentLabel: 'ポジティブ',
      positiveCount: 3,
      negativeCount: 1,
      reason: 'ポジティブ材料が増加',
      signalDate: '2026-06-15',
      updatedAt: '2026-06-15T12:00:00+00:00',
    },
  ];

  it('最新価格・前日比・シグナル・センチメント・更新日時を表示すること', () => {
    // Arrange & Act
    render(<TopStocksRanking stocks={stocks} />);
    const stockLink = screen.getByRole('link', {
      name: '1位 AAPL Apple Inc. の銘柄詳細を見る',
    });
    const expected = {
      href: '/stocks/1',
      price: '182.50',
      change: '+2.35%',
      signal: '+8.25',
      sentiment: 'ポジティブ',
      updatedAt: '更新 2026/06/15 21:00',
    };

    // Assert
    expect(stockLink).toHaveAttribute('href', expected.href);
    expect(screen.getByText(expected.price)).toBeVisible();
    expect(screen.getByText(expected.change)).toBeVisible();
    expect(screen.getByText(expected.signal)).toBeVisible();
    expect(screen.getByText(expected.sentiment)).toBeVisible();
    expect(screen.getByText(expected.updatedAt)).toBeVisible();
  });

  it('価格・前日比・センチメント・更新日時がない場合に空の意味を表示すること', () => {
    // Arrange
    const stock: TopStockData = {
      ...stocks[0]!,
      latestPrice: null,
      changePercent: null,
      sentiment: null,
      sentimentLabel: null,
      updatedAt: null,
    };

    // Act
    render(<TopStocksRanking stocks={[stock]} />);
    const expected = ['未取得', '未算出', 'センチメント未分析', '更新日時不明'];
    const actual = expected.map((text) => screen.getByText(text).textContent);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('空状態を表示すること', () => {
    // Arrange & Act
    render(<TopStocksRanking stocks={[]} />);

    // Assert
    expect(screen.getByText('シグナルがあるウォッチ銘柄はありません')).toBeInTheDocument();
  });
});
