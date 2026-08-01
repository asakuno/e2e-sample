import { expect, test } from '@playwright/test';

test('DashboardからAnalysis、Stocks、Newsへの遷移でレイアウトDOMを維持する', async ({ page }) => {
  // Arrange
  await page.goto('/dashboard');
  const persistentSideNav = page.locator('aside.fixed');
  await expect(persistentSideNav).toBeVisible();
  await persistentSideNav.evaluate((element) => {
    element.dataset.persistenceProbe = 'preserved';
  });

  // Act
  await persistentSideNav.getByRole('link', { name: 'Analysis', exact: true }).click();

  // Assert
  await expect(page).toHaveURL(/\/analysis$/);
  await expect(page.getByRole('heading', { name: '期間ニュース分析' })).toBeVisible();
  await expect(persistentSideNav).toHaveAttribute('data-persistence-probe', 'preserved');

  await persistentSideNav.getByRole('link', { name: 'Stocks', exact: true }).click();
  await expect(page).toHaveURL(/\/stocks$/);
  await expect(page.getByRole('heading', { name: '銘柄検索' })).toBeVisible();
  await expect(persistentSideNav).toHaveAttribute('data-persistence-probe', 'preserved');

  await persistentSideNav.getByRole('link', { name: 'News', exact: true }).click();
  await expect(page).toHaveURL(/\/news$/);
  await expect(page.getByRole('heading', { name: 'News', exact: true })).toBeVisible();
  await expect(persistentSideNav).toHaveAttribute('data-persistence-probe', 'preserved');
});
