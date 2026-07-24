import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import type { NewsAnalysis, NewsArticle } from '@/types/news';
import { StockAnalysisList } from '../StockAnalysisList';

const analysis: NewsAnalysis = {
  id: 7,
  stock: { id: 1, symbol: 'AAPL', name: 'Apple Inc.', market: 'us' },
  summary: '需要の増加が業績を押し上げる可能性があります。',
  sentiment: 1,
  sentiment_label: 'ポジティブ',
  impact_score: 8,
  confidence_score: 91,
  time_horizon: 2,
  time_horizon_label: '中期',
  positive_factors: ['需要増加', '利益率改善'],
  negative_factors: ['部材価格上昇'],
  risk_points: ['為替変動'],
  reason: '複数の先行指標が改善しています。',
  analyzed_at: '2026-07-10 11:30:00',
};

const article: NewsArticle = {
  id: 12,
  title: 'Apple supplier raises guidance',
  summary: 'Supplier demand is improving.',
  url: 'https://example.com/apple',
  source: 'Reuters',
  provider: 'alpha-vantage',
  language: 'en',
  published_at: '2026-07-10 10:00:00',
  stocks: [],
  analyses: [analysis],
};

describe('StockAnalysisList', () => {
  it('AI要約、材料、リスク、時間軸と記事への導線を表示すること', () => {
    // Arrange
    const expected = {
      title: article.title,
      summary: analysis.summary,
      positive: analysis.positive_factors[0]!,
      negative: analysis.negative_factors[0]!,
      risk: analysis.risk_points[0]!,
      reason: analysis.reason,
      horizon: analysis.time_horizon_label,
      href: '/news?article_id=12',
    };

    // Act
    render(<StockAnalysisList analyses={[analysis]} articles={[article]} />);
    const actual = {
      title: screen.getByRole('heading', { name: expected.title }).textContent,
      summary: screen.getByText(expected.summary).textContent,
      positive: screen.getByText(expected.positive).textContent,
      negative: screen.getByText(expected.negative).textContent,
      risk: screen.getByText(expected.risk).textContent,
      reason: screen.getByText(expected.reason).textContent,
      horizon: screen.getByText(expected.horizon).textContent,
      href: screen.getByRole('link', { name: '記事の分析を見る' }).getAttribute('href'),
    };

    // Assert
    expect(actual).toEqual(expected);
  });

  it('AI分析がない場合は空状態を表示すること', () => {
    // Arrange
    const expected = 'AI分析結果はまだありません';

    // Act
    render(<StockAnalysisList analyses={[]} articles={[]} />);
    const actual = screen.getByText(expected).textContent;

    // Assert
    expect(actual).toBe(expected);
  });
});
