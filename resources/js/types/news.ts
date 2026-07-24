import type { AppPageProps, PaginatedData } from '@/types/index.d.ts';

export interface NewsArticleStock {
  id: number;
  symbol: string;
  name: string;
  market: string;
  relevance_score: number | null;
  matched_by: string | null;
}

export interface NewsAnalysisStock {
  id: number;
  symbol: string;
  name: string;
  market: string;
}

export interface NewsAnalysis {
  id: number;
  stock: NewsAnalysisStock;
  summary: string;
  sentiment: number;
  sentiment_label: string;
  impact_score: number;
  confidence_score: number;
  time_horizon: number;
  time_horizon_label: string;
  positive_factors: string[];
  negative_factors: string[];
  risk_points: string[];
  reason: string;
  analyzed_at: string | null;
}

export interface NewsArticle {
  id: number;
  title: string;
  summary: string | null;
  url: string;
  source: string | null;
  provider: string;
  language: string | null;
  published_at: string | null;
  stocks: NewsArticleStock[];
  analyses: NewsAnalysis[];
}

export interface NewsFilters {
  article_id: string;
  stock_id: string;
  sentiment: string;
  analysis_status: '' | 'unanalyzed';
  from: string;
  to: string;
}

export interface NewsSelectOption {
  value: number;
  label: string;
}

export interface NewsPageProps extends AppPageProps {
  news: PaginatedData<NewsArticle>;
  filters: NewsFilters;
  stockOptions: NewsSelectOption[];
  sentimentOptions: NewsSelectOption[];
}
