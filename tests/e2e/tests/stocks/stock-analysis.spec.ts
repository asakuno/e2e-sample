import { expect, test } from '@playwright/test';
import { StocksPage } from '../../pages/stock/StocksPage';

test.describe('銘柄分析の主要導線（要件 7.2・7.3）', () => {
  test('STOCK_FLOW_001: 銘柄を検索して詳細画面へ遷移できる', async ({ page }) => {
    // Arrange
    const symbol = 'AAPL';
    const stocksPage = new StocksPage(page);
    await stocksPage.goto();

    // Act
    await stocksPage.search(symbol);

    // Assert
    await expect(page).toHaveURL(/\/stocks\?.*q=AAPL/);
    await stocksPage.expectStockVisible(symbol);

    // Act
    const stockDetailPage = await stocksPage.openStock(symbol);

    // Assert
    await stockDetailPage.expectLoaded(symbol);
  });
});
