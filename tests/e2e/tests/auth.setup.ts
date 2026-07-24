import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test as setup } from '@playwright/test';
import { LoginPage } from '../pages/auth/LoginPage';

const authFile = 'playwright/.auth/user.json';

setup('認証済みセッションを準備する', async ({ page }) => {
  // Arrange
  const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? 'test@example.com';
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD ?? 'password';
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Act
  await loginPage.login(email, password);

  // Assert
  await expect(page.getByRole('heading', { name: 'マーケットダッシュボード' })).toBeVisible();
  await mkdir(dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
