import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import type { AnalysisBatch, AnalysisImport } from '@/types/analysis';

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  router: {
    post: vi.fn(),
    reload: vi.fn(),
  },
  useForm: vi.fn((data: Record<string, unknown>) => ({
    withPrecognition: vi.fn(() => ({
      data,
      setData: vi.fn(),
      submit: vi.fn(),
      processing: false,
      errors: {},
    })),
  })),
}));

vi.mock('@/layouts/AuthenticatedLayout', () => ({
  AuthenticatedLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AnalysisShow from '../Show';

const committedImport: AnalysisImport = {
  id: 10,
  revision: 2,
  base_current_revision: 1,
  current_revision: 2,
  expected_revision: 3,
  mode: 2,
  mode_label: '置き換え',
  status: 5,
  status_label: '確定済み',
  model_name: 'gpt-5',
  original_filename: 'analysis.csv',
  file_size: 1024,
  file_hash: 'a'.repeat(64),
  normalized_payload: null,
  validation_errors: null,
  stale_history: null,
  replacement_reason: '更新',
  raw_available: true,
  uploaded_at: '2026-07-24T09:00:00+09:00',
  raw_stored_at: '2026-07-24T09:00:00+09:00',
  validated_at: '2026-07-24T09:01:00+09:00',
  committed_at: '2026-07-24T09:02:00+09:00',
  raw_file_deleted_at: null,
};

const batch: AnalysisBatch = {
  public_id: '01JTESTBATCH',
  stock: { id: 1, symbol: 'AAPL', name: 'Apple', market: 'us' },
  period_start: '2026-07-01',
  period_end: '2026-07-07',
  prompt_version: 'stock-news-period-v1',
  result_schema_version: 'stock-news-period-result-v1',
  prompt_text: 'prompt',
  prompt_hash: 'b'.repeat(64),
  input_hash: 'c'.repeat(64),
  status: 3,
  status_label: '分析取込済み',
  news_count: 2,
  source_char_count: 1200,
  exported_at: '2026-07-24T08:30:00+09:00',
  current_import: committedImport,
  current_result: null,
  news: [],
  imports: [
    {
      ...committedImport,
      id: 9,
      revision: 1,
      status: 6,
      status_label: '置き換え済み',
    },
    committedImport,
  ],
  created_at: '2026-07-24T08:00:00+09:00',
  updated_at: '2026-07-24T09:05:00+09:00',
};

const commonProps = {
  app: { name: 'App', env: 'testing', locale: 'ja' },
  auth: { user: { id: 1, name: 'Test' } },
  flash: {},
  errors: {},
};

describe('Analysis show', () => {
  it('置き換え前に現在と置き換え後のrevisionを表示すること', () => {
    render(<AnalysisShow {...commonProps} batch={batch} />);

    expect(screen.getByText('現在: revision 2 → 置き換え後: revision 3')).toBeInTheDocument();
  });
});
