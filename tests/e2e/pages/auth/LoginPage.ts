import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('メールアドレス');
    this.passwordInput = page.getByLabel('パスワード', { exact: true });
    this.loginButton = page.getByRole('button', { name: 'ログインする' });
    this.forgotPasswordLink = page.getByRole('link', { name: 'パスワードをお忘れですか？' });
  }

  async goto(): Promise<void> {
    await this.navigateTo('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await Promise.all([this.page.waitForURL('**/dashboard'), this.loginButton.click()]);
  }
}
