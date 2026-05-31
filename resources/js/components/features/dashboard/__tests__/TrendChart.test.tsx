/**
 * TrendChart コンポーネントテスト
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { TrendData } from '@/types/dashboard';
import { TrendChart } from '../TrendChart';

describe('TrendChart', () => {
  const defaultProps: TrendData = {
    total: 1500,
    changePercent: '+8.2%',
    changeDirection: 'up',
    description: '先月比',
    points: [
      { label: '1月', value: 100 },
      { label: '2月', value: 150 },
      { label: '3月', value: 130 },
    ],
  };

  it('合計値が表示されること', () => {
    render(<TrendChart {...defaultProps} />);
    expect(screen.getByText('1500')).toBeInTheDocument();
  });

  it('変化率が表示されること', () => {
    render(<TrendChart {...defaultProps} />);
    expect(screen.getByText('+8.2%')).toBeInTheDocument();
  });

  it('説明が表示されること', () => {
    render(<TrendChart {...defaultProps} />);
    expect(screen.getByText('先月比')).toBeInTheDocument();
  });
});
