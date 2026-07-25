import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { NewsAnalysis } from '@/types/news';
import { NewsAnalysisCard } from '../NewsAnalysisCard';

vi.mock('@inertiajs/react', () => ({
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  router: { visit: vi.fn() },
}));

const analysis: NewsAnalysis = {
  id: 1,
  stock: {
    id: 10,
    symbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'us',
  },
  summary: '需要増加による売上成長が見込まれます。',
  sentiment: 1,
  sentiment_label: 'ポジティブ',
  impact_score: 8,
  confidence_score: 90,
  time_horizon: 1,
  time_horizon_label: '短期',
  positive_factors: ['新製品需要'],
  negative_factors: ['供給制約'],
  risk_points: ['市場変動'],
  reason: '受注状況が市場予想を上回ったためです。',
  analyzed_at: '2026-07-12 10:30:00',
};

describe('NewsAnalysisCard', () => {
  it('判断に必要な時間軸・理由・材料・リスクと銘柄詳細への導線を表示すること', () => {
    // Arrange & Act
    render(<NewsAnalysisCard analysis={analysis} />);
    const stockLink = screen.getByRole('link', {
      name: 'AAPL Apple Inc. の銘柄詳細を見る',
    });
    const expectedTexts = [
      '短期',
      '受注状況が市場予想を上回ったためです。',
      '新製品需要',
      '供給制約',
      '市場変動',
    ];
    const actualTexts = expectedTexts.map((text) => screen.getByText(text).textContent);

    // Assert
    expect({ href: stockLink.getAttribute('href'), texts: actualTexts }).toEqual({
      href: '/stocks/10',
      texts: expectedTexts,
    });
  });

  it('材料・リスクがない場合は抽出結果がないことを明示すること', () => {
    // Arrange
    const analysisWithoutFactors: NewsAnalysis = {
      ...analysis,
      positive_factors: [],
      negative_factors: [],
      risk_points: [],
      reason: '',
    };

    // Act
    render(<NewsAnalysisCard analysis={analysisWithoutFactors} />);
    const actual = {
      emptyMessage: screen.getByText('抽出された材料・リスクはありません').textContent,
      reasonHeading: screen.queryByText('判断理由')?.textContent ?? null,
    };

    // Assert
    expect(actual).toEqual({
      emptyMessage: '抽出された材料・リスクはありません',
      reasonHeading: null,
    });
  });
});
