/** Verifies responsive demos, input ownership, and motion accessibility in Chromium. */
import { expect, test } from '@playwright/test';

for (const width of [1440, 390, 320]) {
  test(`playground works at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sway.');
    const clipIds = await page.locator('clipPath').evaluateAll((clips) => clips.map((clip) => clip.id));
    expect(clipIds.length).toBeGreaterThan(0);
    expect(new Set(clipIds).size).toBe(clipIds.length);
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
    const gallery = page.getByRole('region', { name: 'Depth image gallery' });
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery.locator('img')).toHaveCount(7);
    await expect(gallery.locator('[data-duplicate]')).toHaveCount(0);
    const plane = gallery.locator('.react-sway-depth-item').nth(1);
    const depth = () => plane.evaluate((element) => Number.parseFloat((element as HTMLElement).style.transform.split(',')[2]));
    const toward = await depth();
    await expect.poll(depth).toBeGreaterThan(toward);
    await page.getByRole('group', { name: 'Depth direction controls' }).getByRole('button', { name: 'away', exact: true }).click();
    const away = await depth();
    await expect.poll(depth).toBeLessThan(away);
    // Space pauses autonomous motion; manual input remains available without moving the page.
    await gallery.focus();
    await gallery.press('Space');
    const paused = await depth();
    await page.waitForTimeout(150);
    expect(await depth()).toBe(paused);
    const scrollY = await page.evaluate(() => window.scrollY);
    await gallery.hover();
    await page.mouse.wheel(0, 120);
    await expect.poll(depth).not.toBe(paused);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
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
  const gallery = page.getByRole('region', { name: 'Depth image gallery' });
  await gallery.scrollIntoViewIfNeeded();
  const plane = gallery.locator('.react-sway-depth-item').nth(1);
  const initial = await plane.evaluate((element) => element.style.transform);
  await page.waitForTimeout(150);
  expect(await plane.evaluate((element) => element.style.transform)).toBe(initial);
  await gallery.press('ArrowDown');
  await expect.poll(() => plane.evaluate((element) => element.style.transform)).not.toBe(initial);
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toContain('user-scalable=no');
});
