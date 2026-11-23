import { expect, test } from '@playwright/test';

/**
 * EXAMPLE (skipped) — how to test an interactive / canvas page (a game, a drawing
 * tool, anything with a render loop + input). Delete this file or unskip + adapt it
 * to YOUR page. A unit test on your engine logic is not enough: it won't catch the
 * "builds fine but crashes / does nothing when you actually open and use it" bug.
 * This pattern loads the real page, drives real input, and fails on any runtime error.
 *
 * Change `ROUTE`, the canvas/root selector, and the interactions to match your app.
 */
test.describe('interactive page (example — unskip + adapt)', () => {
  const ROUTE = '/'; // e.g. '/' if your game IS the home page, or '/game'

  test.skip('renders a canvas, takes input, and never throws', async ({
    page,
  }) => {
    // 1. Fail on ANY uncaught error or console.error during the whole test.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
    });

    // 2. Load the page and confirm the canvas actually mounted.
    await page.goto(ROUTE);
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // 3. Drive real input — keyboard, pointer/mouse, clicks. For a game, start it and
    //    play a few frames so the render loop + collision code actually execute.
    await canvas.click(); // focus / start
    await page.keyboard.press('Space'); // e.g. launch/serve
    for (let i = 0; i < 8; i++) {
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(60); // let requestAnimationFrame tick
      await page.keyboard.up('ArrowRight');
    }
    // Pointer control (paddle-follows-mouse style):
    const box = await canvas.boundingBox();
    if (box)
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.9);

    // 4. Assert something OBSERVABLE changed (score/lives/UI text), and no error fired.
    //    Replace with a real signal from your UI, e.g.:
    //    await expect(page.getByTestId('score')).not.toHaveText('0');
    await page.waitForTimeout(200);
    expect(
      errors,
      `runtime errors while playing:\n${errors.join('\n')}`,
    ).toEqual([]);
  });
});
