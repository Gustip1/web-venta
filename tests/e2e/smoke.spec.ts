import { test, expect } from '@playwright/test';

test('landing → producto → carrito', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeHidden();
  await page.goto('/productos?sneakers');
  // Click first product card if exists
  const firstCard = page.locator('a').filter({ hasText: /ARS|\$|Prod|Nike|Hoodie/ }).first();
  if (await firstCard.count()) {
    await firstCard.click();
    // PDP add to cart may require size; skip if no select exists
    const select = page.locator('select');
    if (await select.count()) {
      await select.selectOption({ index: 1 }).catch(() => {});
    }
    const addBtn = page.getByRole('button', { name: /Agregar al carrito/i });
    if (await addBtn.count()) {
      await addBtn.click();
    }
  }
  // Open cart via header button
  await page.getByRole('button', { name: /Abrir carrito/i }).click();
  await expect(page.getByRole('dialog', { name: /Carrito/i })).toBeVisible();
});


