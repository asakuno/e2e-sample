import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

vi.mock('@inertiajs/react', () => ({
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}));

import { PeriodAnalysisCard } from '../PeriodAnalysisCard';

describe('PeriodAnalysisCard', () => {
  it('current revisionと期間signalをbatch詳細への導線付きで表示すること', () => {
    render(
      <PeriodAnalysisCard
        analysis={{
          public_id: '01JTEST',
          period_start: '2026-07-01',
          period_end: '2026-07-07',
          revision: 2,
          summary: '期間分析の要約',
          sentiment_label: 'ポジティブ',
          impact_score: 6,
          confidence_score: 80,
          evidence_items: [],
          reason: '分析理由',
          model_name: 'gpt-5',
        }}
        signal={{
          signal_date: '2026-07-08',
          news_score: 4.8,
          total_score: 4.8,
          positive_count: 2,
          negative_count: 1,
          neutral_count: 0,
          reason: '分析理由',
        }}
      />,
    );

    expect(screen.getByText('期間分析の要約')).toBeInTheDocument();
    expect(screen.getByText('revision 2 / ポジティブ')).toBeInTheDocument();
    expect(screen.getByText('4.80')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /revisionと根拠を確認/ })).toHaveAttribute(
      'href',
      '/analysis/01JTEST',
    );
  });

  it('current分析がない場合は空状態を表示すること', () => {
    render(<PeriodAnalysisCard analysis={null} signal={null} />);
    expect(screen.getByText('この銘柄の期間ニュース分析はまだありません。')).toBeInTheDocument();
  });
});
