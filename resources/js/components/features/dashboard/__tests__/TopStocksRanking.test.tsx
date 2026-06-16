import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { TopStockData } from '@/types/dashboard';
import { TopStocksRanking } from '../TopStocksRanking';

describe('TopStocksRanking', () => {
  const stocks: TopStockData[] = [
    {
      id: 1,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'us',
      totalScore: 8.25,
      positiveCount: 3,
      negativeCount: 1,
      reason: 'ポジティブ材料が増加',
      signalDate: '2026-06-15',
    },
  ];

  it('注目銘柄ランキングを表示すること', () => {
    render(<TopStocksRanking stocks={stocks} />);

    expect(screen.getByText('注目銘柄ランキング')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('8.25')).toBeInTheDocument();
  });

  it('空状態を表示すること', () => {
    render(<TopStocksRanking stocks={[]} />);

    expect(screen.getByText('シグナルがあるウォッチ銘柄はありません')).toBeInTheDocument();
  });
});
