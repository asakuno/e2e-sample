import { expect, test } from '@playwright/test';

test('認証後ページ間の遷移でレイアウトDOMを維持する', async ({ page }) => {
  // Arrange
  await page.goto('/dashboard');
  const persistentSideNav = page.locator('aside.fixed');
  await expect(persistentSideNav).toBeVisible();
  await persistentSideNav.evaluate((element) => {
    element.dataset.persistenceProbe = 'preserved';
  });

  // Act
  await persistentSideNav.getByRole('link', { name: 'News', exact: true }).click();

  // Assert
  await expect(page).toHaveURL(/\/news$/);
  await expect(page.getByRole('heading', { name: 'News', exact: true })).toBeVisible();
  await expect(persistentSideNav).toHaveAttribute('data-persistence-probe', 'preserved');
});
