import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const inertiaMocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  usePage: vi.fn(() => ({
    url: '/analysis',
    props: { auth: { user: { id: 1, name: 'Test' } } },
  })),
  router: { get: inertiaMocks.get },
}));

import AnalysisIndex from '../Index';

const commonProps = {
  app: { name: 'App', env: 'testing', locale: 'ja' },
  auth: { user: { id: 1, name: 'Test' } },
  flash: {},
  errors: {},
};

describe('Analysis index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('所有batchの状態、期間、revisionと作成導線を表示すること', () => {
    render(
      <AnalysisIndex
        {...commonProps}
        batches={[
          {
            public_id: '01JTEST',
            stock: { id: 1, symbol: 'AAPL', name: 'Apple', market: 'us' },
            period_start: '2026-07-01',
            period_end: '2026-07-07',
            prompt_version: 'stock-news-period-v1',
            result_schema_version: 'stock-news-period-result-v1',
            status: 3,
            status_label: '分析取込済み',
            news_count: 3,
            source_char_count: 1200,
            current_revision: 2,
            updated_at: '2026-07-08T00:00:00+09:00',
          },
        ]}
        statusOptions={[
          { value: 1, label: '準備済み' },
          { value: 3, label: '分析取込済み' },
        ]}
        filters={{ status: '' }}
        pagination={{ current_page: 1, last_page: 1, prev: null, next: null, total: 1 }}
      />,
    );

    expect(screen.getByRole('heading', { name: '期間ニュース分析' })).toBeInTheDocument();
    expect(screen.getAllByText('分析取込済み')).toHaveLength(2);
    expect(screen.getByText('revision 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AAPL Apple/ })).toHaveAttribute(
      'href',
      '/analysis/01JTEST',
    );
    expect(screen.getByRole('link', { name: '新しい分析' })).toHaveAttribute(
      'href',
      '/analysis/create',
    );
  });

  it('状態を変更すると1ページ目から絞り込み直すこと', () => {
    render(
      <AnalysisIndex
        {...commonProps}
        batches={[]}
        statusOptions={[
          { value: 1, label: '準備済み' },
          { value: 3, label: '分析取込済み' },
        ]}
        filters={{ status: '' }}
        pagination={{
          current_page: 2,
          last_page: 3,
          prev: '/analysis?page=1',
          next: null,
          total: 31,
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText('状態'), { target: { value: '3' } });

    expect(screen.getByRole('link', { name: '前へ' })).toHaveAttribute('href', '/analysis?page=1');
    expect(screen.queryByRole('link', { name: '次へ' })).not.toBeInTheDocument();
    expect(screen.getByText('次へ').tagName).toBe('SPAN');
    expect(inertiaMocks.get).toHaveBeenCalledWith(
      '/analysis',
      { page: 1, status: '3' },
      {
        only: ['batches', 'filters', 'pagination'],
        preserveScroll: true,
        preserveState: true,
        replace: true,
      },
    );
  });
});
