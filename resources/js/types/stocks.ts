/**
 * 銘柄画面の型定義
 */
import type { AppPageProps } from '@/types/index.d.ts';

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
  selected_period: StockPeriodOption['value'];
  period_options: StockPeriodOption[];
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
}

export interface StockDetailPageProps extends AppPageProps {
  stock: StockDetail;
}
