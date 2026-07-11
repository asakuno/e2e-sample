import { describe, expect, it } from 'vite-plus/test';
import type { DashboardStatData } from '@/types/dashboard';
import type { StatCardData } from './StatCard';
import { presentDashboardStat } from './stat-presentation';

describe('presentDashboardStat', () => {
  it('ウォッチリスト件数を桁区切りした表示データへ変換すること', () => {
    // Arrange
    const stat: DashboardStatData = { kind: 'watchlist', value: 1234 };
    const expected: StatCardData = {
      label: 'ウォッチリスト銘柄数',
      value: '1,234',
      change: '監視中',
      changeDirection: 'neutral',
      icon: 'visibility',
      iconColorClass: 'text-blue-600',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('ポジティブ分析件数を上昇表示データへ変換すること', () => {
    // Arrange
    const stat: DashboardStatData = { kind: 'positiveAnalysis', value: 2 };
    const expected: StatCardData = {
      label: '直近ポジティブ材料',
      value: '2',
      subLabel: '対象',
      subValue: '直近7日',
      change: 'AI分析結果',
      changeDirection: 'up',
      icon: 'trending_up',
      iconColorClass: 'text-green-600',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('ネガティブ分析件数を下降表示データへ変換すること', () => {
    // Arrange
    const stat: DashboardStatData = { kind: 'negativeAnalysis', value: 1 };
    const expected: StatCardData = {
      label: '直近ネガティブ材料',
      value: '1',
      subLabel: '対象',
      subValue: '直近7日',
      change: 'AI分析結果',
      changeDirection: 'down',
      icon: 'trending_down',
      iconColorClass: 'text-red-600',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('未分析ニュースがある場合に中立表示データへ変換すること', () => {
    // Arrange
    const stat: DashboardStatData = { kind: 'unanalyzedNews', value: 3 };
    const expected: StatCardData = {
      label: '未分析ニュース',
      value: '3',
      change: 'ウォッチ銘柄関連',
      changeDirection: 'neutral',
      icon: 'article',
      iconColorClass: 'text-orange-600',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('未分析ニュースがない場合に上昇表示データへ変換すること', () => {
    // Arrange
    const stat: DashboardStatData = { kind: 'unanalyzedNews', value: 0 };
    const expected: StatCardData = {
      label: '未分析ニュース',
      value: '0',
      change: 'ウォッチ銘柄関連',
      changeDirection: 'up',
      icon: 'article',
      iconColorClass: 'text-orange-600',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('最新分析日時がある場合に日付と時刻の表示データへ変換すること', () => {
    // Arrange
    const stat: DashboardStatData = { kind: 'latestAnalysis', value: '2026-06-15 11:00' };
    const expected: StatCardData = {
      label: '最新分析日時',
      value: '2026-06-15',
      subLabel: '時刻',
      subValue: '11:00',
      change: '最終更新',
      changeDirection: 'neutral',
      icon: 'schedule',
      iconColorClass: 'text-gray-600',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('最新分析日時に時刻がない場合に日付のみの表示データへ変換すること', () => {
    // Arrange
    const stat: DashboardStatData = { kind: 'latestAnalysis', value: '2026-06-15' };
    const expected: StatCardData = {
      label: '最新分析日時',
      value: '2026-06-15',
      change: '最終更新',
      changeDirection: 'neutral',
      icon: 'schedule',
      iconColorClass: 'text-gray-600',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('最新分析日時がない場合に未分析の表示データへ変換すること', () => {
    // Arrange
    const stat: DashboardStatData = { kind: 'latestAnalysis', value: null };
    const expected: StatCardData = {
      label: '最新分析日時',
      value: '未分析',
      change: '分析結果なし',
      changeDirection: 'neutral',
      icon: 'schedule',
      iconColorClass: 'text-gray-600',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });
});
