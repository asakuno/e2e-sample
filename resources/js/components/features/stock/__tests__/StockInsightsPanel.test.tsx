import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { StockInsightsPanel } from '../StockInsightsPanel';

describe('StockInsightsPanel', () => {
  it('各データが空の場合、それぞれの空状態を表示すること', () => {
    // Arrange
    const expected = [
      '関連ニュースはまだありません',
      'AI分析結果はまだありません',
      'シグナルはまだありません',
    ];

    // Act
    render(<StockInsightsPanel relatedNews={[]} analyses={[]} signals={[]} />);
    const actual = expected.map((message) => screen.getByText(message).textContent);

    // Assert
    expect(actual).toEqual(expected);
  });
});
