/**
 * 銘柄画面の型定義
 */
import type { AppPageProps } from '@/types/index.d.ts';
import type { NewsAnalysis, NewsArticle } from '@/types/news';

export interface StockListItem {
  id: number;
  symbol: string;
  name: string;
  market: string;
  exchange: string | null;
  country: string;
  currency: string;
  sector: string | null;
  industry: string | null;
  is_in_watchlist?: boolean;
}

export interface StockPricePoint {
  price_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjusted_close: number | null;
  volume: number | null;
}

export interface StockPeriodOption {
  value: '1M' | '3M' | '6M' | '1Y';
  label: string;
}

export interface StockDetail extends StockListItem {
  description: string | null;
  latest_price: StockPricePoint | null;
  price_history: StockPricePoint[];
  related_news: NewsArticle[];
  analyses: NewsAnalysis[];
  signals: StockSignal[];
  latest_period_analysis: PeriodAnalysisSummary | null;
  period_signal: PeriodAnalysisSignal | null;
  selected_period: StockPeriodOption['value'];
  period_options: StockPeriodOption[];
}

export interface PeriodAnalysisSummary {
  public_id: string;
  period_start: string;
  period_end: string;
  revision: number | null;
  summary: string;
  sentiment_label: string;
  impact_score: number;
  confidence_score: number;
  evidence_items: Array<{
    news_key: string;
    type: 'positive' | 'negative' | 'risk' | 'context';
    note: string;
  }>;
  reason: string;
  model_name: string;
}

export interface PeriodAnalysisSignal {
  signal_date: string;
  news_score: number;
  total_score: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  reason: string | null;
}

export interface StockSignal {
  id: number;
  signal_date: string;
  news_score: number;
  disclosure_score: number;
  macro_score: number;
  total_score: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  reason: string | null;
  generated_at: string;
}

export interface StockFilters {
  q: string;
  market: string;
}

export interface StockMarketOption {
  value: string;
  label: string;
}

export interface StocksPageProps extends AppPageProps {
  stocks: StockListItem[];
  filters: StockFilters;
  marketOptions: StockMarketOption[];
  watchlistedStockIds: number[];
}

export interface StockDetailPageProps extends AppPageProps {
  stock: StockDetail;
}
