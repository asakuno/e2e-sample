import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { NewsArticle } from '@/types/news';
import { StockRelatedNewsList } from '../StockRelatedNewsList';

const article: NewsArticle = {
  id: 3,
  title: 'Apple announces a new service',
  summary: 'Service revenue is expected to expand.',
  url: 'https://example.com/apple-service',
  source: 'Reuters',
  provider: 'alpha-vantage',
  language: 'en',
  published_at: '2026-07-10 10:00:00',
  stocks: [],
  analyses: [
    {
      id: 8,
      stock: { id: 1, symbol: 'AAPL', name: 'Apple Inc.', market: 'us' },
      summary: 'サービス売上の拡大が見込まれます。',
      sentiment: 1,
      sentiment_label: 'ポジティブ',
      impact_score: 7,
      confidence_score: 88,
      time_horizon: 2,
      time_horizon_label: '中期',
      positive_factors: ['継続課金'],
      negative_factors: [],
      risk_points: ['競争激化'],
      reason: '契約者数が増加しています。',
      analyzed_at: '2026-07-10 11:00:00',
    },
  ],
};

describe('StockRelatedNewsList', () => {
  it('記事の要点、銘柄分析、News詳細導線と元記事導線を表示すること', () => {
    // Arrange
    const expected = {
      title: article.title,
      analysis: article.analyses[0]!.summary,
      internalHref: '/news?article_id=3',
      externalHref: article.url,
    };

    // Act
    render(<StockRelatedNewsList articles={[article]} />);
    const actual = {
      title: screen.getByRole('heading', { name: expected.title }).textContent,
      analysis: screen.getByText(expected.analysis).textContent,
      internalHref: screen.getByRole('link', { name: /Newsで分析を見る/ }).getAttribute('href'),
      externalHref: screen.getByRole('link', { name: /元記事/ }).getAttribute('href'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('関連ニュースがない場合は空状態を表示すること', () => {
    // Arrange
    const expected = '関連ニュースはまだありません';

    // Act
    render(<StockRelatedNewsList articles={[]} />);
    const actual = screen.getByText(expected).textContent;

    // Assert
    expect(actual).toBe(expected);
  });

  it('記事のAI分析が未実施の場合は状態を明示すること', () => {
    // Arrange
    const expected = 'AI分析は未実施です';

    // Act
    render(<StockRelatedNewsList articles={[{ ...article, analyses: [] }]} />);
    const actual = screen.getByText(expected).textContent;

    // Assert
    expect(actual).toBe(expected);
  });
});
