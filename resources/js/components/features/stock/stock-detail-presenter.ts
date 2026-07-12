import type { StockPricePoint } from '@/types/stocks';

export function calculatePeriodChange(
  prices: StockPricePoint[],
): { amount: number; percent: number } | null {
  const validPrices = prices.filter(
    (price): price is StockPricePoint & { effective_close: number } =>
      price.effective_close !== null,
  );

  if (validPrices.length < 2) {
    return null;
  }

  const first = validPrices[0]!.effective_close;
  const last = validPrices[validPrices.length - 1]!.effective_close;

  return {
    amount: last - first,
    percent: first === 0 ? 0 : ((last - first) / first) * 100,
  };
}

export function calculatePreviousDayChange(
  latestPrice: StockPricePoint | null,
  prices: StockPricePoint[],
): { amount: number; percent: number } | null {
  if (latestPrice === null || latestPrice.effective_close === null) {
    return null;
  }

  const previousPrice = prices
    .filter(
      (price): price is StockPricePoint & { effective_close: number } =>
        price.effective_close !== null && price.price_date < latestPrice.price_date,
    )
    .sort((left, right) => right.price_date.localeCompare(left.price_date))[0];

  if (previousPrice === undefined) {
    return null;
  }

  return {
    amount: latestPrice.effective_close - previousPrice.effective_close,
    percent:
      previousPrice.effective_close === 0
        ? 0
        : ((latestPrice.effective_close - previousPrice.effective_close) /
            previousPrice.effective_close) *
          100,
  };
}
