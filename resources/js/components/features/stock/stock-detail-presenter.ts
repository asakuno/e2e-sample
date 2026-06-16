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
