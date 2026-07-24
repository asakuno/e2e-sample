import { describe, expect, it } from 'vite-plus/test';
import type { StockPricePoint } from '@/types/stocks';
import { calculatePeriodChange, calculatePreviousDayChange } from '../stock-detail-presenter';

const latestPrice: StockPricePoint = {
  price_date: '2026-07-10',
  open: 208,
  high: 214,
  low: 207,
  close: 210,
  adjusted_close: 210,
  effective_close: 210,
  volume: 2000,
};

describe('calculatePreviousDayChange', () => {
  it('価格履歴が日付順でない場合も直近営業日の前日比を返すこと', () => {
    // Arrange
    const prices: StockPricePoint[] = [
      latestPrice,
      {
        ...latestPrice,
        price_date: '2026-07-08',
        close: 190,
        adjusted_close: 190,
        effective_close: 190,
      },
      {
        ...latestPrice,
        price_date: '2026-07-09',
        close: 200,
        adjusted_close: 200,
        effective_close: 200,
      },
    ];
    const expected = { amount: 10, percent: 5 };

    // Act
    const actual = calculatePreviousDayChange(latestPrice, prices);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('比較できる過去価格がない場合はnullを返すこと', () => {
    // Arrange
    const expected = null;

    // Act
    const actual = calculatePreviousDayChange(latestPrice, [latestPrice]);

    // Assert
    expect(actual).toBe(expected);
  });

  it('最新価格がない場合はnullを返すこと', () => {
    // Arrange
    const expected = null;

    // Act
    const actual = calculatePreviousDayChange(null, [latestPrice]);

    // Assert
    expect(actual).toBe(expected);
  });

  it('比較対象の終値が0の場合は騰落率を0として返すこと', () => {
    // Arrange
    const prices = [
      {
        ...latestPrice,
        price_date: '2026-07-09',
        close: 0,
        adjusted_close: 0,
        effective_close: 0,
      },
    ];
    const expected = { amount: 210, percent: 0 };

    // Act
    const actual = calculatePreviousDayChange(latestPrice, prices);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('通常終値と調整後終値が異なる場合は調整後終値で前日比を返すこと', () => {
    // Arrange
    const adjustedLatestPrice = {
      ...latestPrice,
      close: 210,
      adjusted_close: 105,
      effective_close: 105,
    };
    const prices = [
      {
        ...latestPrice,
        price_date: '2026-07-09',
        close: 200,
        adjusted_close: 100,
        effective_close: 100,
      },
      adjustedLatestPrice,
    ];
    const expected = { amount: 5, percent: 5 };

    // Act
    const actual = calculatePreviousDayChange(adjustedLatestPrice, prices);

    // Assert
    expect(actual).toEqual(expected);
  });

  it('期間騰落も調整後終値を基準に返すこと', () => {
    // Arrange
    const prices = [
      {
        ...latestPrice,
        price_date: '2026-06-10',
        close: 200,
        adjusted_close: 100,
        effective_close: 100,
      },
      {
        ...latestPrice,
        close: 220,
        adjusted_close: 110,
        effective_close: 110,
      },
    ];
    const expected = { amount: 10, percent: 10 };

    // Act
    const actual = calculatePeriodChange(prices);

    // Assert
    expect(actual).toEqual(expected);
  });
});
