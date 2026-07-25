import { expect, test } from '@playwright/test';

test('Dashboardの概要を先に表示し、遅延取得後に詳細を表示する', async ({ page }) => {
  // Arrange
  let releaseDetails = () => {};
  const detailsGate = new Promise<void>((resolve) => {
    releaseDetails = resolve;
  });
  await page.route('**/dashboard', async (route) => {
    const isDetailsRequest =
      route.request().headers()['x-inertia-partial-data'] === 'dashboardDetails';

    if (isDetailsRequest) {
      await detailsGate;
    }

    await route.continue();
  });

  // Act
  await page.goto('/dashboard');

  // Assert: overview is usable while details are pending
  await expect(page.getByRole('heading', { name: 'マーケットダッシュボード' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '状況サマリー' })).toBeVisible();
  await expect(page.getByRole('status', { name: '確認候補を読み込み中' })).toBeVisible();
  await expect(page.getByRole('status', { name: '注目銘柄を読み込み中' })).toBeVisible();
  await expect(page.getByRole('status', { name: '分析推移を読み込み中' })).toBeVisible();

  releaseDetails();

  await expect(page.getByRole('heading', { name: '現在の確認候補' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '注目銘柄ランキング' })).toBeVisible();
  await expect(page.getByText('直近7日の分析件数')).toBeVisible();
});

test('Dashboardの遅延取得が失敗しても概要とナビゲーションを操作できる', async ({ page }) => {
  // Arrange
  await page.route('**/dashboard', async (route) => {
    const isDetailsRequest =
      route.request().headers()['x-inertia-partial-data'] === 'dashboardDetails';

    if (isDetailsRequest) {
      await route.abort('failed');

      return;
    }

    await route.continue();
  });

  // Act
  await page.goto('/dashboard');

  // Assert
  await expect(page.getByRole('heading', { name: 'マーケットダッシュボード' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '状況サマリー' })).toBeVisible();
  await page.locator('aside.fixed').getByRole('link', { name: 'Stocks', exact: true }).click();
  await expect(page).toHaveURL(/\/stocks$/);
  await expect(page.getByRole('heading', { name: '銘柄検索' })).toBeVisible();
});
