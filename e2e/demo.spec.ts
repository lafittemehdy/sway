import { expect, test } from '@playwright/test';

for (const width of [1440, 390, 320]) {
  test(`playground works at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sway.');
    await expect(page.getByRole('link', { name: 'Documentation' })).toHaveAttribute('href', /github.com\/lafittemehdy\/sway/);
    const pause = page.getByRole('button', { name: 'Pause motion' });
    await pause.click();
    await expect(page.getByRole('button', { name: 'Resume motion' })).toHaveAttribute('aria-pressed', 'true');
    const rail = page.locator('.layout-horizontal-axis .react-sway-container');
    const position = await rail.evaluate((element) => element.style.transform);
    await page.waitForTimeout(150);
    expect(await rail.evaluate((element) => element.style.transform)).toBe(position);
    await page.getByRole('button', { name: 'Resume motion' }).click();
    await expect.poll(() => rail.evaluate((element) => element.style.transform)).not.toBe(position);
    await page.getByRole('group', { name: 'Horizontal direction controls' }).getByRole('button', { name: 'right', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Horizontal direction controls' }).getByRole('button', { name: 'right', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('reduced motion disables automatic movement and browser zoom remains available', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Reduced motion enabled' })).toBeDisabled();
  const rail = page.locator('.layout-horizontal-axis .react-sway-container');
  await expect(rail).toBeVisible();
  const position = await rail.evaluate((element) => element.style.transform);
  await page.waitForTimeout(150);
  expect(await rail.evaluate((element) => element.style.transform)).toBe(position);
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toContain('user-scalable=no');
});
