import { index as newsIndex } from '@/routes/news';
import { show as stockShow } from '@/routes/stocks';
import type { ActivityItemData, DashboardStatData, TopStockData } from '@/types/dashboard';

export type DashboardPriorityFeedItemKind = 'importantNews' | 'topStock' | 'unanalyzedNews';

export interface DashboardPriorityFeedItem {
  id: string;
  kind: DashboardPriorityFeedItemKind;
  label: string;
  variant: 'neutral' | 'primary' | 'positive' | 'negative' | 'warning' | 'info';
  title: string;
  description: string;
  meta?: string;
  href?: string;
}

interface ImportantNewsPresentation {
  label: string;
  variant: DashboardPriorityFeedItem['variant'];
}

const IMPORTANT_NEWS_PRESENTATIONS = {
  green: { label: 'ポジティブ材料', variant: 'positive' },
  orange: { label: 'ネガティブ材料', variant: 'negative' },
  blue: { label: '中立材料', variant: 'info' },
  gray: { label: '重要ニュース', variant: 'neutral' },
} as const satisfies Record<ActivityItemData['dotColor'], ImportantNewsPresentation>;

function presentImportantNews(news: ActivityItemData): DashboardPriorityFeedItem {
  const item: DashboardPriorityFeedItem = {
    id: `important-news-${news.id}`,
    kind: 'importantNews',
    ...IMPORTANT_NEWS_PRESENTATIONS[news.dotColor],
    title: news.title,
    description: news.description,
    meta: news.timeAgo,
  };

  if (news.articleId === null) {
    return item;
  }

  return {
    ...item,
    href: newsIndex.url({ query: { article_id: news.articleId } }),
  };
}

function presentStockSignalVariant(totalScore: number): DashboardPriorityFeedItem['variant'] {
  if (totalScore > 0) {
    return 'positive';
  }

  if (totalScore < 0) {
    return 'negative';
  }

  return 'neutral';
}

function presentTopStock(stock: TopStockData): DashboardPriorityFeedItem {
  return {
    id: `top-stock-${stock.id}`,
    kind: 'topStock',
    label: '注目シグナル',
    variant: presentStockSignalVariant(stock.totalScore),
    title: `${stock.symbol} ${stock.name}`,
    description:
      stock.reason ??
      `ポジティブ材料 ${stock.positiveCount}件 / ネガティブ材料 ${stock.negativeCount}件`,
    meta: `シグナルスコア ${stock.totalScore.toFixed(2)}${
      stock.signalDate === null ? '' : ` · ${stock.signalDate}`
    }`,
    href: stockShow.url(stock.id),
  };
}

function presentUnanalyzedNews(count: number): DashboardPriorityFeedItem {
  return {
    id: 'unanalyzed-news',
    kind: 'unanalyzedNews',
    label: '分析待ち',
    variant: 'warning',
    title: `${count.toLocaleString('ja-JP')}件のニュースが分析待ちです`,
    description: 'ウォッチ銘柄に関するニュースを確認してください',
  };
}

/**
 * ダッシュボードに表示する候補を、種類が偏らないよう最大3件に整形する。
 */
export function presentDashboardPriorityFeed(
  stats: DashboardStatData[],
  importantNews: ActivityItemData[],
  topStocks: TopStockData[],
): DashboardPriorityFeedItem[] {
  const items: DashboardPriorityFeedItem[] = [];
  const firstImportantNews = importantNews[0];
  const firstTopStock = topStocks[0];
  const unanalyzedNewsCount = stats.find((stat) => stat.kind === 'unanalyzedNews')?.value;

  if (firstImportantNews !== undefined) {
    items.push(presentImportantNews(firstImportantNews));
  }

  if (firstTopStock !== undefined) {
    items.push(presentTopStock(firstTopStock));
  }

  if (typeof unanalyzedNewsCount === 'number' && unanalyzedNewsCount > 0) {
    items.push(presentUnanalyzedNews(unanalyzedNewsCount));
  }

  const supplementalItems = [
    ...importantNews.slice(1).map(presentImportantNews),
    ...topStocks.slice(1).map(presentTopStock),
  ];

  return [...items, ...supplementalItems].slice(0, 3);
}
