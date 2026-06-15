import type { AppPageProps } from '@/types/index.d.ts';
import type { StockListItem } from '@/types/stocks';

export interface WatchlistItem {
  id: number;
  stock: StockListItem;
  memo: string | null;
  priority: number;
  is_active: boolean;
}

export interface WatchlistPageProps extends AppPageProps {
  watchlists: WatchlistItem[];
}

export interface WatchlistPriorityOption {
  value: number;
  label: string;
}
