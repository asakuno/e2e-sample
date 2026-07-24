import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { StockDetailPage } from './StockDetailPage';

export class StocksPage extends BasePage {
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly stockTable: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByLabel('銘柄コード・企業名');
    this.searchButton = page.getByRole('button', { name: '検索', exact: true });
    this.stockTable = page.getByRole('table');
  }

  async goto(): Promise<void> {
    await this.navigateTo('/stocks');
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchButton.click();
  }

  async expectStockVisible(symbol: string): Promise<void> {
    await expect(this.stockRow(symbol)).toBeVisible();
  }

  async openStock(symbol: string): Promise<StockDetailPage> {
    await this.stockRow(symbol).getByRole('link', { name: '開く' }).click();
    await this.page.waitForURL(/\/stocks\/\d+/);

    return new StockDetailPage(this.page, new URL(this.page.url()).pathname);
  }

  private stockRow(symbol: string): Locator {
    return this.stockTable.getByRole('row').filter({ hasText: symbol });
  }
}
