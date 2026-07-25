import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { AnalysisBatch, AnalysisImport } from '@/types/analysis';

const formMocks = vi.hoisted(() => ({
  submit: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@inertiajs/react', async () => {
  const React = await import('react');

  return {
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ href, children, ...props }: Record<string, unknown>) => (
      <a href={href as string} {...props}>
        {children as React.ReactNode}
      </a>
    ),
    router: { post: formMocks.post },
    useForm: vi.fn((initialData: Record<string, unknown>) => {
      const [data, setDataState] = React.useState(initialData);

      return {
        withPrecognition: vi.fn(() => ({
          data,
          setData: (key: string, value: unknown) => {
            setDataState((current) => ({ ...current, [key]: value }));
          },
          submit: (...args: unknown[]) => formMocks.submit({ ...data }, ...args),
          processing: false,
          errors: {},
        })),
      };
    }),
  };
});

vi.mock('@/layouts/AuthenticatedLayout', () => ({
  AuthenticatedLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AnalysisImportPreview from '../ImportPreview';

const staleImport: AnalysisImport = {
  id: 10,
  revision: null,
  base_current_revision: 1,
  current_revision: 2,
  expected_revision: 3,
  mode: 1,
  mode_label: '初回取込',
  status: 4,
  status_label: '再preview待ち',
  model_name: 'gpt-5',
  original_filename: 'analysis.csv',
  file_size: 1024,
  file_hash: 'a'.repeat(64),
  normalized_payload: null,
  validation_errors: null,
  stale_history: null,
  replacement_reason: '最新revisionへ再準備するため',
  raw_available: true,
  uploaded_at: '2026-07-24T09:00:00+09:00',
  raw_stored_at: '2026-07-24T09:00:00+09:00',
  validated_at: '2026-07-24T09:01:00+09:00',
  committed_at: null,
  raw_file_deleted_at: null,
};

const currentImport: AnalysisImport = {
  ...staleImport,
  id: 11,
  revision: 1,
  base_current_revision: null,
  current_revision: 1,
  expected_revision: 2,
  status: 5,
  status_label: '確定済み',
  replacement_reason: null,
  committed_at: '2026-07-24T09:05:00+09:00',
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
  exported_at: null,
  current_import: currentImport,
  current_result: null,
  news: [],
  imports: [staleImport, currentImport],
  created_at: '2026-07-24T08:00:00+09:00',
  updated_at: '2026-07-24T09:05:00+09:00',
};

const commonProps = {
  app: { name: 'App', env: 'testing', locale: 'ja' },
  auth: { user: { id: 1, name: 'Test' } },
  flash: {},
  errors: {},
};

describe('Analysis import preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('既知モデルのstale importでモデル不明を選択した場合、モデル名を空にして再previewできること', () => {
    // Arrange
    const expected = {
      csv_file: null,
      model_unknown: true,
      model_name: '',
      replacement_reason: '最新revisionへ再準備するため',
    };
    render(<AnalysisImportPreview {...commonProps} batch={batch} analysisImport={staleImport} />);

    // Act
    fireEvent.click(screen.getByRole('checkbox', { name: 'モデル名を特定できない' }));
    fireEvent.click(screen.getByRole('button', { name: '再preview' }));
    const actual = formMocks.submit.mock.calls[0]?.[0];

    // Assert
    expect(actual).toEqual(expected);
  });

  it('upload時点と現在と確定予定のrevisionを表示し、stale importを再previewへ案内すること', () => {
    render(<AnalysisImportPreview {...commonProps} batch={batch} analysisImport={staleImport} />);

    expect(screen.getByText('アップロード時のcurrent')).toBeInTheDocument();
    expect(screen.getByText('現在のcurrent')).toBeInTheDocument();
    expect(screen.getByText('確定予定')).toBeInTheDocument();
    expect(screen.getByText(/このimportは再previewが必要です/)).toHaveTextContent(
      'アップロード時のcurrentはrevision 1、現在のcurrentはrevision 2です。',
    );
  });

  it('置き換え確定前に現在と確定後のrevisionを具体的に確認すること', () => {
    const validatedReplacement: AnalysisImport = {
      ...staleImport,
      mode: 2,
      mode_label: '置き換え',
      status: 2,
      status_label: '検証済み',
      base_current_revision: 1,
      current_revision: 1,
      expected_revision: 2,
      replacement_reason: '根拠を更新するため',
    };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <AnalysisImportPreview
        {...commonProps}
        batch={batch}
        analysisImport={validatedReplacement}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'revision 2へ置き換えて確定' }));

    expect(confirm).toHaveBeenCalledWith(
      'revision 1をrevision 2へ置き換えます。\n理由: 根拠を更新するため',
    );
    expect(formMocks.post).toHaveBeenCalled();
  });

  it('確定済みimportでは将来の予定値ではなく実際のrevisionを表示すること', () => {
    const committed: AnalysisImport = {
      ...currentImport,
      revision: 2,
      current_revision: 2,
      expected_revision: 9,
    };

    render(<AnalysisImportPreview {...commonProps} batch={batch} analysisImport={committed} />);

    expect(screen.getByText('このimportのrevision').parentElement).toHaveTextContent('revision 2');
    expect(screen.queryByText('確定予定')).not.toBeInTheDocument();
  });
});
