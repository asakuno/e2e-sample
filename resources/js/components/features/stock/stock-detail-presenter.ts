import type { StockPricePoint } from '@/types/stocks';

export function calculatePeriodChange(
  prices: StockPricePoint[],
): { amount: number; percent: number } | null {
  const validPrices = prices.filter(
    (price): price is StockPricePoint & { close: number } => price.close !== null,
  );

  if (validPrices.length < 2) {
    return null;
  }

  const first = validPrices[0]!.close;
  const last = validPrices[validPrices.length - 1]!.close;

  return {
    amount: last - first,
    percent: first === 0 ? 0 : ((last - first) / first) * 100,
  };
}

export function calculatePreviousDayChange(
  latestPrice: StockPricePoint | null,
  prices: StockPricePoint[],
): { amount: number; percent: number } | null {
  if (latestPrice === null || latestPrice.close === null) {
    return null;
  }

  const previousPrice = prices
    .filter(
      (price): price is StockPricePoint & { close: number } =>
        price.close !== null && price.price_date < latestPrice.price_date,
    )
    .sort((left, right) => right.price_date.localeCompare(left.price_date))[0];

  if (previousPrice === undefined) {
    return null;
  }

  return {
    amount: latestPrice.close - previousPrice.close,
    percent:
      previousPrice.close === 0
        ? 0
        : ((latestPrice.close - previousPrice.close) / previousPrice.close) * 100,
  };
}
