import type { AppIconName } from '@/components/ui/AppIcon';
import type { DashboardStatData, DashboardStatKind } from '@/types/dashboard';
import type { StatCardData } from './StatCard';

interface DashboardStatPresentation {
  label: string;
  icon: AppIconName;
  iconColorClass: string;
}

const COUNT_FORMATTER = new Intl.NumberFormat('ja-JP');

const STAT_PRESENTATIONS = {
  watchlist: {
    label: 'ウォッチリスト銘柄数',
    icon: 'visibility',
    iconColorClass: 'text-info',
  },
  positiveAnalysis: {
    label: '直近ポジティブ材料',
    icon: 'trending_up',
    iconColorClass: 'text-positive',
  },
  negativeAnalysis: {
    label: '直近ネガティブ材料',
    icon: 'trending_down',
    iconColorClass: 'text-negative',
  },
  unanalyzedNews: {
    label: '未分析ニュース',
    icon: 'article',
    iconColorClass: 'text-warning',
  },
  latestAnalysis: {
    label: '最新分析日時',
    icon: 'schedule',
    iconColorClass: 'text-muted-foreground',
  },
} as const satisfies Record<DashboardStatKind, DashboardStatPresentation>;

export function presentDashboardStat(stat: DashboardStatData): StatCardData {
  const presentation = STAT_PRESENTATIONS[stat.kind];

  switch (stat.kind) {
    case 'watchlist':
      return {
        ...presentation,
        value: COUNT_FORMATTER.format(stat.value),
        change: '監視中',
        changeDirection: 'neutral',
      };
    case 'positiveAnalysis':
      return {
        ...presentation,
        value: COUNT_FORMATTER.format(stat.value),
        subLabel: '対象',
        subValue: '直近7日',
        change: 'AI分析結果',
        changeDirection: 'up',
      };
    case 'negativeAnalysis':
      return {
        ...presentation,
        value: COUNT_FORMATTER.format(stat.value),
        subLabel: '対象',
        subValue: '直近7日',
        change: 'AI分析結果',
        changeDirection: 'down',
      };
    case 'unanalyzedNews':
      return {
        ...presentation,
        value: COUNT_FORMATTER.format(stat.value),
        change: 'ウォッチ銘柄関連',
        changeDirection: stat.value > 0 ? 'neutral' : 'up',
      };
    case 'latestAnalysis': {
      if (stat.value === null) {
        return {
          ...presentation,
          value: '未分析',
          change: '分析結果なし',
          changeDirection: 'neutral',
        };
      }

      const [date = stat.value, time] = stat.value.split(' ', 2);

      return {
        ...presentation,
        value: date,
        ...(time === undefined ? {} : { subLabel: '時刻', subValue: time }),
        change: '最終更新',
        changeDirection: 'neutral',
      };
    }
  }
}
