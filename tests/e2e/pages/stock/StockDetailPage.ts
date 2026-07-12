import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class StockDetailPage extends BasePage {
  readonly backToStocksLink: Locator;
  private readonly path: string;

  constructor(page: Page, path: string) {
    super(page);
    this.path = path;
    this.backToStocksLink = page.getByRole('link', { name: '銘柄一覧へ戻る' });
  }

  async goto(): Promise<void> {
    await this.navigateTo(this.path);
  }

  async expectLoaded(symbol: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/stocks\/\d+/);
    await expect(this.page.getByRole('heading', { name: symbol, exact: true })).toBeVisible();
    await expect(this.page.getByText('最新価格', { exact: true })).toBeVisible();
  }
}
