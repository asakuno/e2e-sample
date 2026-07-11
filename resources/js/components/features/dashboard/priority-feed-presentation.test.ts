import { describe, expect, it } from 'vite-plus/test';
import type { ActivityItemData, DashboardStatData, TopStockData } from '@/types/dashboard';
import {
  type DashboardPriorityFeedItem,
  presentDashboardPriorityFeed,
} from './priority-feed-presentation';

const createNews = (
  id: number,
  dotColor: ActivityItemData['dotColor'] = 'gray',
): ActivityItemData => ({
  id,
  articleId: id,
  title: `ニュース${id}`,
  description: `説明${id}`,
  timeAgo: `${id}分前`,
  dotColor,
});

const createStock = (id: number, reason: string | null = `注目理由${id}`): TopStockData => ({
  id,
  symbol: `STK${id}`,
  name: `銘柄${id}`,
  market: 'us',
  totalScore: 8 + id / 10,
  positiveCount: id + 2,
  negativeCount: id,
  reason,
  signalDate: '2026-07-11',
});

describe('presentDashboardPriorityFeed', () => {
  it('重要ニュース・注目銘柄・未分析ニュースの代表を順番に1件ずつ選ぶこと', () => {
    // Arrange
    const stats: DashboardStatData[] = [{ kind: 'unanalyzedNews', value: 4 }];
    const importantNews = [createNews(1, 'green'), createNews(2)];
    const topStocks = [createStock(1), createStock(2)];

    // Act
    const actual = presentDashboardPriorityFeed(stats, importantNews, topStocks);

    // Assert
    expect(actual.map(({ id }) => id)).toEqual([
      'important-news-1',
      'top-stock-1',
      'unanalyzed-news',
    ]);
  });

  it('代表が不足する場合は2件目以降の重要ニュースを先に補い最大3件にすること', () => {
    // Arrange
    const importantNews = [createNews(1), createNews(2), createNews(3), createNews(4)];
    const topStocks = [createStock(1), createStock(2)];

    // Act
    const actual = presentDashboardPriorityFeed([], importantNews, topStocks);

    // Assert
    expect(actual.map(({ id }) => id)).toEqual([
      'important-news-1',
      'top-stock-1',
      'important-news-2',
    ]);
  });

  it('重要ニュースの補充候補がない場合は2件目以降の注目銘柄で補うこと', () => {
    // Arrange
    const topStocks = [createStock(1), createStock(2), createStock(3)];

    // Act
    const actual = presentDashboardPriorityFeed([], [], topStocks);

    // Assert
    expect(actual.map(({ id }) => id)).toEqual(['top-stock-1', 'top-stock-2', 'top-stock-3']);
  });

  it.each([
    ['green', 'ポジティブ材料', 'positive'],
    ['orange', 'ネガティブ材料', 'negative'],
    ['blue', '中立材料', 'info'],
    ['gray', '重要ニュース', 'neutral'],
  ] as const)(
    'dotColorが%sの重要ニュースを「%s」かつ%s表示へ変換すること',
    (dotColor, expectedLabel, expectedVariant) => {
      // Arrange
      const news = createNews(8, dotColor);

      // Act
      const [actual] = presentDashboardPriorityFeed([], [news], []);

      // Assert
      expect(actual).toEqual({
        id: 'important-news-8',
        kind: 'importantNews',
        label: expectedLabel,
        variant: expectedVariant,
        title: 'ニュース8',
        description: '説明8',
        meta: '8分前',
        href: '/news?article_id=8',
      });
    },
  );

  it('記事IDがない重要ニュースは誤った遷移先を設定しないこと', () => {
    // Arrange
    const news = { ...createNews(1), articleId: null };

    // Act
    const [actual] = presentDashboardPriorityFeed([], [news], []);

    // Assert
    expect(actual).not.toHaveProperty('href');
  });

  it('重要ニュースのdescriptionを加工せず表示データへ引き継ぐこと', () => {
    // Arrange
    const news = {
      ...createNews(1),
      description: 'AAPL / impact 8: 売上成長にポジティブ',
    };

    // Act
    const [actual] = presentDashboardPriorityFeed([], [news], []);

    // Assert
    expect(actual?.description).toBe('AAPL / impact 8: 売上成長にポジティブ');
  });

  it('理由がある注目銘柄を銘柄詳細への表示データへ変換すること', () => {
    // Arrange
    const stock = createStock(2, '業績予想が上方修正されました');
    const expected: DashboardPriorityFeedItem = {
      id: 'top-stock-2',
      kind: 'topStock',
      label: '注目シグナル',
      variant: 'positive',
      title: 'STK2 銘柄2',
      description: '業績予想が上方修正されました',
      meta: 'シグナルスコア 8.20 · 2026-07-11',
      href: '/stocks/2',
    };

    // Act
    const [actual] = presentDashboardPriorityFeed([], [], [stock]);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('理由がない注目銘柄はポジティブ・ネガティブ材料件数を説明にすること', () => {
    // Arrange
    const stock = createStock(2, null);

    // Act
    const [actual] = presentDashboardPriorityFeed([], [], [stock]);

    // Assert
    expect(actual?.description).toBe('ポジティブ材料 4件 / ネガティブ材料 2件');
  });

  it.each([
    ['正の場合', 2.5, 'positive'],
    ['負の場合', -2.5, 'negative'],
    ['0の場合', 0, 'neutral'],
  ] as const)('シグナルスコアが%sは%s表示にすること', (_, totalScore, expectedVariant) => {
    // Arrange
    const stock = { ...createStock(1), totalScore };

    // Act
    const [actual] = presentDashboardPriorityFeed([], [], [stock]);

    // Assert
    expect(actual?.variant).toBe(expectedVariant);
  });

  it('シグナル日付がない注目銘柄はメタ情報をスコアだけにすること', () => {
    // Arrange
    const stock = { ...createStock(1), totalScore: 3, signalDate: null };

    // Act
    const [actual] = presentDashboardPriorityFeed([], [], [stock]);

    // Assert
    expect(actual?.meta).toBe('シグナルスコア 3.00');
  });

  it('未分析ニュース件数が正の場合だけリンクなしの表示データを作ること', () => {
    // Arrange
    const stats: DashboardStatData[] = [{ kind: 'unanalyzedNews', value: 1234 }];

    // Act
    const [actual] = presentDashboardPriorityFeed(stats, [], []);

    // Assert
    expect(actual).toEqual({
      id: 'unanalyzed-news',
      kind: 'unanalyzedNews',
      label: '分析待ち',
      variant: 'warning',
      title: '1,234件のニュースが分析待ちです',
      description: 'ウォッチ銘柄に関するニュースを確認してください',
    });
  });

  it.each([
    ['統計自体がない場合', []],
    ['未分析ニュースが0件の場合', [{ kind: 'unanalyzedNews', value: 0 }]],
  ] satisfies ReadonlyArray<readonly [string, DashboardStatData[]]>)(
    '%sは項目を作らないこと',
    (_, stats) => {
      // Arrange

      // Act
      const actual = presentDashboardPriorityFeed(stats, [], []);

      // Assert
      expect(actual).toEqual([]);
    },
  );
});
