import type { NewsAnalysis } from '@/types/news';

export function formatNewsDateTime(value: string): string {
  const normalized = value.replace('T', ' ');

  return normalized.length >= 16 ? normalized.slice(0, 16) : normalized;
}

export function formatSignedImpactScore(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  if (value < 0) {
    return `−${Math.abs(value)}`;
  }

  return '0';
}

export function selectPrimaryAnalysis(analyses: NewsAnalysis[]): NewsAnalysis | undefined {
  return analyses.reduce<NewsAnalysis | undefined>((primary, analysis) => {
    if (primary === undefined || Math.abs(analysis.impact_score) > Math.abs(primary.impact_score)) {
      return analysis;
    }

    return primary;
  }, undefined);
}
