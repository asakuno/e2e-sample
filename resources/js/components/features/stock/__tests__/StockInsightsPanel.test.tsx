import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { StockInsightsPanel } from '../StockInsightsPanel';

describe('StockInsightsPanel', () => {
  it('関連ニュースとAI分析の内容、およびシグナルの空状態を表示すること', () => {
    // Arrange
    const expected = ['関連ニュースの内容', 'AI分析の内容', 'シグナルはまだありません'];

    // Act
    render(
      <StockInsightsPanel
        relatedNews={<p>関連ニュースの内容</p>}
        analyses={<p>AI分析の内容</p>}
        signals={[]}
      />,
    );
    const actual = expected.map((message) => screen.getByText(message).textContent);

    // Assert
    expect(actual).toEqual(expected);
  });
});
