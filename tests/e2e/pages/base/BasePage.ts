import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * BasePage - すべてのPage Objectが継承する抽象基底クラス
 * 共通のページ操作メソッドを提供
 * baseURLはplaywright.config.tsで設定
 */
export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * ページ固有のURLに遷移（サブクラスで実装必須）
   */
  abstract goto(): Promise<void>;

  /**
   * 指定したパスに遷移
   * Playwright の Auto-waiting に任せる（手動待機は不要）
   * @param path 遷移先のパス（例: '/jobs/create'）
   */
  protected async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * ページタイトルが期待値と一致することを確認
   * Web-first Assertion を使用
   * @param expectedTitle 期待するページタイトル
   */
  async expectTitle(expectedTitle: string): Promise<void> {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  /**
   * 指定したURLに遷移するまで待機
   * @param url 期待するURL（部分一致）
   */
  async waitForURL(url: string): Promise<void> {
    await this.page.waitForURL(url);
  }
}
