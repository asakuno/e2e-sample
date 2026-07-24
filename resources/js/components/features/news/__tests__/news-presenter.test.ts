import { describe, expect, it } from 'vite-plus/test';
import type { NewsAnalysis } from '@/types/news';
import {
  formatNewsDateTime,
  formatSignedImpactScore,
  selectPrimaryAnalysis,
} from '../news-presenter';

const createAnalysis = (id: number, impactScore: number): NewsAnalysis => ({
  id,
  stock: {
    id,
    symbol: `STK${id}`,
    name: `銘柄${id}`,
    market: 'us',
  },
  summary: `AI要約${id}`,
  sentiment: 0,
  sentiment_label: '中立',
  impact_score: impactScore,
  confidence_score: 80,
  time_horizon: 0,
  time_horizon_label: '不明',
  positive_factors: [],
  negative_factors: [],
  risk_points: [],
  reason: `判断理由${id}`,
  analyzed_at: '2026-07-12T10:30:00+09:00',
});

describe('formatNewsDateTime', () => {
  it.each([
    ['2026-07-11T14:30:00Z', '2026/07/11 23:30'],
    ['2026-07-11T18:00:00Z', '2026/07/12 03:00'],
  ])('UTC日時%sをAsia/Tokyoの%sへ整形すること', (value, expected) => {
    // Arrange
    const dateTime = value;

    // Act
    const actual = formatNewsDateTime(dateTime);

    // Assert
    expect(actual).toBe(expected);
  });

  it('不正な日時ではハイフンを返すこと', () => {
    // Arrange
    const value = 'invalid-date-time';

    // Act
    const actual = formatNewsDateTime(value);

    // Assert
    expect(actual).toBe('-');
  });
});

describe('formatSignedImpactScore', () => {
  it.each([
    [8, '+8'],
    [-9, '−9'],
    [0, '0'],
  ])('impact score %sを符号付きの%sへ整形すること', (value, expected) => {
    // Arrange
    const impactScore = value;

    // Act
    const actual = formatSignedImpactScore(impactScore);

    // Assert
    expect(actual).toBe(expected);
  });
});

describe('selectPrimaryAnalysis', () => {
  it('impact scoreの絶対値が最大の分析を選ぶこと', () => {
    // Arrange
    const analyses = [createAnalysis(1, 1), createAnalysis(2, -9), createAnalysis(3, 8)];

    // Act
    const actual = selectPrimaryAnalysis(analyses);

    // Assert
    expect(actual?.id).toBe(2);
  });

  it('impact scoreの絶対値が同じ場合は先に現れた分析を選ぶこと', () => {
    // Arrange
    const analyses = [createAnalysis(1, 9), createAnalysis(2, -9)];

    // Act
    const actual = selectPrimaryAnalysis(analyses);

    // Assert
    expect(actual?.id).toBe(1);
  });

  it('分析がない場合はundefinedを返すこと', () => {
    // Arrange
    const analyses: NewsAnalysis[] = [];

    // Act
    const actual = selectPrimaryAnalysis(analyses);

    // Assert
    expect(actual).toBeUndefined();
  });
});
