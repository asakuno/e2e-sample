import type { AppPageProps } from '@/types/index.d.ts';

export interface AnalysisStockSnapshot {
  id: number;
  symbol: string;
  name: string;
  market: string;
}

export interface AnalysisBatchListItem {
  public_id: string;
  stock: AnalysisStockSnapshot;
  period_start: string;
  period_end: string;
  prompt_version: string;
  result_schema_version: string;
  status: number;
  status_label: string;
  news_count: number;
  source_char_count: number;
  current_revision: number | null;
  updated_at: string;
}

export interface AnalysisEvidence {
  news_key: string;
  type: 'positive' | 'negative' | 'risk' | 'context';
  note: string;
}

export interface AnalysisResultPayload {
  schema_version?: string;
  batch_key?: string;
  prompt_version?: string;
  summary: string;
  sentiment: number | string;
  sentiment_label?: string;
  impact_score: number;
  confidence_score: number;
  time_horizon: number | string;
  time_horizon_label?: string;
  positive_factors: string[];
  negative_factors: string[];
  risk_points: string[];
  evidence_items: AnalysisEvidence[];
  reason: string;
  model_provider?: string;
  model_name?: string;
  analyzed_at?: string;
}

export interface AnalysisImport {
  id: number;
  revision: number | null;
  mode: 1 | 2;
  mode_label: string;
  status: 1 | 2 | 3 | 4 | 5 | 6;
  status_label: string;
  model_name: string;
  original_filename: string;
  file_size: number;
  file_hash: string;
  normalized_payload: AnalysisResultPayload | null;
  validation_errors: Record<string, string[]> | null;
  stale_history: Array<Record<string, string | number | null>> | null;
  replacement_reason: string | null;
  raw_available: boolean;
  uploaded_at: string;
  raw_stored_at: string;
  validated_at: string | null;
  committed_at: string | null;
  raw_file_deleted_at: string | null;
}

export interface AnalysisBatchNews {
  news_key: string;
  position: number;
  title: string;
  summary: string | null;
  body: string | null;
  source: string | null;
  url: string;
  published_at: string;
  content_hash: string;
  snapshot_hash: string;
}

export interface AnalysisBatch {
  public_id: string;
  stock: AnalysisStockSnapshot;
  period_start: string;
  period_end: string;
  prompt_version: string;
  result_schema_version: string;
  prompt_text: string;
  prompt_hash: string;
  input_hash: string;
  status: number;
  status_label: string;
  news_count: number;
  source_char_count: number;
  exported_at: string | null;
  current_import: AnalysisImport | null;
  current_result: AnalysisResultPayload | null;
  news: AnalysisBatchNews[];
  imports: AnalysisImport[];
  created_at: string;
  updated_at: string;
}

export interface AnalysisCandidateNews {
  id: number;
  title: string;
  summary: string | null;
  source: string | null;
  url: string;
  published_at: string;
  character_count: number;
}

export interface AnalysisIndexPageProps extends AppPageProps {
  batches: AnalysisBatchListItem[];
  pagination: {
    current_page: number;
    last_page: number;
    prev: string | null;
    next: string | null;
    total: number;
  };
}

export interface AnalysisCreatePageProps extends AppPageProps {
  stockOptions: Array<{ value: number; label: string }>;
  filters: {
    stock_id: string;
    from_date: string;
    to_date: string;
  };
  preview: {
    news: AnalysisCandidateNews[];
    news_count: number;
    source_char_count: number;
  };
  limits: {
    min_news_count: number;
    max_news_count: number;
    max_source_char_count: number;
  };
}

export interface AnalysisShowPageProps extends AppPageProps {
  batch: AnalysisBatch;
}

export interface AnalysisImportPreviewPageProps extends AppPageProps {
  batch: AnalysisBatch;
  analysisImport: AnalysisImport;
}
