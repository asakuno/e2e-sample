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
      changeTone: 'neutral',
      icon: 'visibility',
      iconColorClass: 'text-info',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('ポジティブ分析件数をポジティブ表示データへ変換すること', () => {
    // Arrange
    const stat: DashboardStatData = { kind: 'positiveAnalysis', value: 2 };
    const expected: StatCardData = {
      label: '直近ポジティブ材料',
      value: '2',
      subLabel: '対象',
      subValue: '直近7日',
      change: 'AI分析結果',
      changeTone: 'positive',
      icon: 'trending_up',
      iconColorClass: 'text-positive',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('ネガティブ分析件数をネガティブ表示データへ変換すること', () => {
    // Arrange
    const stat: DashboardStatData = { kind: 'negativeAnalysis', value: 1 };
    const expected: StatCardData = {
      label: '直近ネガティブ材料',
      value: '1',
      subLabel: '対象',
      subValue: '直近7日',
      change: 'AI分析結果',
      changeTone: 'negative',
      icon: 'trending_down',
      iconColorClass: 'text-negative',
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
      changeTone: 'neutral',
      icon: 'article',
      iconColorClass: 'text-warning',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('未分析ニュースがない場合にポジティブ表示データへ変換すること', () => {
    // Arrange
    const stat: DashboardStatData = { kind: 'unanalyzedNews', value: 0 };
    const expected: StatCardData = {
      label: '未分析ニュース',
      value: '0',
      change: 'ウォッチ銘柄関連',
      changeTone: 'positive',
      icon: 'article',
      iconColorClass: 'text-warning',
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
      changeTone: 'neutral',
      icon: 'schedule',
      iconColorClass: 'text-muted-foreground',
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
      changeTone: 'neutral',
      icon: 'schedule',
      iconColorClass: 'text-muted-foreground',
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
      changeTone: 'neutral',
      icon: 'schedule',
      iconColorClass: 'text-muted-foreground',
    };

    // Act
    const actual = presentDashboardStat(stat);

    // Assert
    expect(actual).toEqual(expected);
  });
});
