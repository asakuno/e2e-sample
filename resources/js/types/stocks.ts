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
  stock: StockListItem;
}
