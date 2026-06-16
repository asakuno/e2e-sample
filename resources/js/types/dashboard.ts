/**
 * ダッシュボード画面の型定義
 */
import type { AppPageProps } from '@/types/index.d.ts';

/** 統計カードデータ */
export interface StatCardData {
  label: string;
  value: string;
  subLabel?: string;
  subValue?: string;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  icon: string;
  iconColorClass: string;
}

/** トレンドデータポイント */
export interface TrendDataPoint {
  label: string;
  value: number;
}

/** トレンドデータ */
export interface TrendData {
  total: number;
  changePercent: string;
  changeDirection: 'up' | 'down' | 'neutral';
  description: string;
  points: TrendDataPoint[];
}

/** アクティビティアイテムデータ */
export interface ActivityItemData {
  id: number;
  title: string;
  description: string;
  timeAgo: string;
  dotColor: 'blue' | 'green' | 'orange' | 'gray';
}

/** 注目銘柄ランキングデータ */
export interface TopStockData {
  id: number;
  symbol: string;
  name: string;
  market: string;
  totalScore: number;
  positiveCount: number;
  negativeCount: number;
  reason: string | null;
  signalDate: string | null;
}

/** ダッシュボードページProps */
export interface DashboardPageProps extends AppPageProps {
  stats: StatCardData[];
  recentTrend: TrendData;
  topStocks: TopStockData[];
  importantNews: ActivityItemData[];
  latestAnalysisAt: string | null;
}
