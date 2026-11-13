import { expect, test, type Page } from '@playwright/test';
import { stage, start } from './helpers';

const parentButton = (page: Page) => page.getByRole('button', { name: /Rincón de padres/ });

async function hold(page: Page, ms: number): Promise<void> {
  const box = (await parentButton(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function answer(page: Page, offset = 0): Promise<void> {
  const [a, b] = (await page.getByTestId('sum').innerText()).split('+').map(Number);
  for (const digit of String(a! + b! + offset)) {
    await page.locator('.keypad').getByRole('button', { name: digit, exact: true }).click();
  }
  await page.getByRole('button', { name: 'OK' }).click();
}

test('the parent gate needs a three-second hold and the right sum', async ({ page }) => {
  await start(page);

  // A child's tap, or a short press, does nothing.
  await hold(page, 800);
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');

  await hold(page, 3300);
  await expect(stage(page)).toHaveAttribute('data-state', 'parentGate');
  await expect(page.getByTestId('sum')).toHaveText(/^\d\d \+ \d\d$/);

  // A wrong answer asks a new sum and stays at the gate.
  await answer(page, 1);
  await expect(stage(page)).toHaveAttribute('data-state', 'parentGate');
  await answer(page);
  await expect(stage(page)).toHaveAttribute('data-state', 'parentArea');
  await expect(page.getByRole('heading', { name: 'Rincón de padres' })).toBeVisible();
});

test('the parent area shows progress and its settings are kept', async ({ page }) => {
  await start(page);
  // Esc is the laptop shortcut to the gate (§5.4).
  await page.keyboard.press('Escape');
  await expect(stage(page)).toHaveAttribute('data-state', 'parentGate');
  await answer(page);

  await expect(page.locator('.objectives li')).toHaveCount(15);
  await expect(page.locator('[data-objective="COL-1"] .status')).toHaveText('Sin empezar');
  await expect(page.getByTestId('stickers')).toHaveText('0');

  await page.getByLabel('Nombre').fill('Martina');
  await page.getByLabel('Tiempo de juego').selectOption('10');
  await page.getByLabel('Calidad gráfica').selectOption('low');
  await page.getByRole('button', { name: 'Volver al juego' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');

  await page.reload();
  await page.getByRole('button', { name: 'Toca para empezar' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');
  await page.keyboard.press('Escape');
  await answer(page);
  await expect(page.getByLabel('Nombre')).toHaveValue('Martina');
  await expect(page.getByLabel('Tiempo de juego')).toHaveValue('10');
  await expect(page.getByLabel('Calidad gráfica')).toHaveValue('low');
});

test('after the session limit Luna rests; a tap wakes her and nothing is locked', async ({
  page,
}) => {
  await start(page);
  // Default limit is 15 minutes: not yet at 14, resting at 15.
  await page.evaluate(() => window.__valle!.elapse(14 * 60));
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');
  await page.evaluate(() => window.__valle!.elapse(61));
  await expect(stage(page)).toHaveAttribute('data-state', 'rest');
  await expect(page.getByRole('button', { name: 'Luna descansa' })).toBeVisible();

  await page.getByRole('button', { name: 'Luna descansa' }).click();
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');
  // The clock starts again: no immediate second rest.
  await page.evaluate(() => window.__valle!.elapse(60));
  await expect(stage(page)).toHaveAttribute('data-state', 'world.idle');
});
