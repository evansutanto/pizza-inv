import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

type Ingredient = 'dough' | 'sauce' | 'cheese' | 'target';
interface LabState {
  phase: string;
  enterCount: number;
  game: { state: string; taps: number };
  camera: { position: [number, number, number]; up: [number, number, number] };
  invitation: { pizzaStarted: boolean; pizzaSettled: boolean; pizzaX: number; elapsed: number };
  kitchenPizzaX: number;
  reducedMotion: boolean;
  atmosphere: { rainDrops: number; rainVertices: number; rainTime: number; lightLevel: number };
  benchmark: {
    requestedQuality: string; appliedQuality: string; appliedPixelRatio: number;
    averageFps: number | null; p95FrameMs: number | null; drawCalls: number; triangles: number;
    renderWidth: number; renderHeight: number; firstInteractiveFrameMs: number | null;
    geometries: number;
  };
  project(id: Ingredient): { x: number; y: number };
  loseContext(): void;
}

const runtimeIssues = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const issues: string[] = [];
  runtimeIssues.set(page, issues);
  page.on('pageerror', error => issues.push(`Exception: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') issues.push(`Console: ${message.text()}`); });
  page.on('requestfailed', request => {
    if (!request.failure()?.errorText.includes('ERR_ABORTED')) issues.push(`Failed request: ${request.url()}`);
  });
  page.on('response', response => {
    if (response.status() >= 400) issues.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') issues.push(`External runtime request: ${request.url()}`);
  });
});

test.afterEach(async ({ page }) => { expect(runtimeIssues.get(page), 'No console exceptions, missing assets, or external runtime requests').toEqual([]); });

async function readLab(page: Page) {
  return page.evaluate(() => {
    const lab = (window as unknown as { __PIZZA_LAB__: LabState }).__PIZZA_LAB__;
    return {
      phase: lab.phase, enterCount: lab.enterCount, game: lab.game, camera: lab.camera, invitation: lab.invitation,
      kitchenPizzaX: lab.kitchenPizzaX, reducedMotion: lab.reducedMotion, benchmark: lab.benchmark,
      atmosphere: lab.atmosphere,
    };
  });
}

async function project(page: Page, id: Ingredient) {
  return page.evaluate(ingredient => (window as unknown as { __PIZZA_LAB__: LabState }).__PIZZA_LAB__.project(ingredient), id);
}

async function phase(page: Page, expected: string, timeout = 10000) {
  await expect(page.locator('body')).toHaveAttribute('data-phase', expected, { timeout });
  if (expected === 'invitation') {
    await expect(page.locator('.view-invite')).toHaveCSS('visibility', 'hidden');
    await expect(page.locator('.masthead')).not.toHaveCSS('color', 'rgb(245, 235, 214)');
  }
}

async function open(page: Page, path = '/') {
  await page.goto(path);
  await phase(page, 'exterior');
  await expect.poll(() => page.evaluate(() => document.fonts.check('500 16px "Helvetica Neue"')),
    { message: 'The locally bundled medium font has loaded' }).toBe(true);
  expect(await page.evaluate(() => [...document.fonts].some(face => face.family.replace(/['"]/g, '') === 'Helvetica Neue' && face.status === 'loaded'))).toBe(true);
}

async function enter(page: Page) {
  await page.getByRole('button', { name: /tap to enter/i }).click();
  await phase(page, 'kitchen');
}

async function clickCanvasPoint(page: Page, id: Ingredient) {
  const point = await project(page, id);
  await page.mouse.click(point.x, point.y);
}

async function completeWithButtons(page: Page, keyboard = false) {
  async function activate(name: RegExp) {
    const button = page.getByRole('button', { name });
    if (keyboard) await button.press('Enter'); else await button.click();
  }
  await activate(/^place the dough$/i);
  for (let i = 1; i <= 3; i++) {
    await activate(/^flatten dough$/i);
    await expect.poll(async () => (await readLab(page)).game.taps).toBe(i);
  }
  await activate(/^add tomato sauce$/i);
  await activate(/^add cheese$/i);
  await expect.poll(async () => (await readLab(page)).game.state).toBe('ready');
}

test('complete journey: guarded entry, vertical camera, ordered recipe, rightward bake, delayed invitation pizza', async ({ page }, testInfo) => {
  await open(page);
  const enterButton = page.getByRole('button', { name: /tap to enter/i });
  const bounds = (await enterButton.boundingBox())!;
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { clickCount: 2, delay: 30 });
  await phase(page, 'entering');
  await phase(page, 'kitchen');
  const kitchen = await readLab(page);
  expect(kitchen.enterCount).toBe(1);
  expect(kitchen.camera.position[0]).toBeCloseTo(0);
  expect(kitchen.camera.position[2]).toBeCloseTo(-8);
  expect(kitchen.camera.position[1]).toBeGreaterThan(10);
  expect(kitchen.camera.up).toEqual([0, 0, -1]);
  expect(kitchen.game).toEqual({ state: 'move', taps: 0 });
  await expect(page.getByRole('button', { name: /click to bake/i, includeHidden: true })).toBeDisabled();

  // Target taps and ingredients out of order must not advance the recipe.
  await clickCanvasPoint(page, 'target');
  await clickCanvasPoint(page, 'cheese');
  await clickCanvasPoint(page, 'target');
  expect((await readLab(page)).game).toEqual({ state: 'move', taps: 0 });
  await page.getByRole('button', { name: /^place the dough$/i }).click();
  expect((await readLab(page)).game.state).toBe('flatten');
  await page.mouse.click(8, 450);
  expect((await readLab(page)).game.taps).toBe(0);
  for (let tap = 1; tap <= 3; tap++) {
    await page.getByRole('button', { name: /^flatten dough$/i }).click();
    await expect.poll(async () => (await readLab(page)).game.taps).toBe(tap);
    if (tap < 3) {
      expect((await readLab(page)).game.state).toBe('flatten');
      await expect(page.getByRole('button', { name: /click to bake/i, includeHidden: true })).toBeDisabled();
    }
  }
  expect((await readLab(page)).game.state).toBe('sauce');
  await clickCanvasPoint(page, 'target');
  expect((await readLab(page)).game.taps).toBe(3);
  expect((await readLab(page)).game.state).toBe('sauce');
  await page.getByRole('button', { name: /^add tomato sauce$/i }).click();
  expect((await readLab(page)).game.state).toBe('cheese');
  await page.getByRole('button', { name: /^add cheese$/i }).click();
  expect((await readLab(page)).game.state).toBe('ready');
  // State is synchronous; allow the physical cheese-spread animation to settle for visual evidence.
  await page.waitForTimeout(700);
  await page.screenshot({ path: testInfo.outputPath('kitchen-desktop-complete.png') });

  const bake = page.getByRole('button', { name: /click to bake/i });
  await expect(bake).toBeEnabled();
  const startX = (await readLab(page)).kitchenPizzaX;
  await bake.click();
  await phase(page, 'baking');
  await expect.poll(async () => (await readLab(page)).kitchenPizzaX).toBeGreaterThan(startX + 0.8);
  await phase(page, 'invitation');
  const initialInvite = (await readLab(page)).invitation;
  expect(initialInvite.pizzaStarted).toBe(false);
  expect(initialInvite.pizzaSettled).toBe(false);
  expect(initialInvite.pizzaX).toBeLessThan(-5);
  const invite = page.getByRole('region', { name: 'Invitation', exact: true });
  await expect(invite.getByText(/saturday, 5 december 2026/i)).toBeVisible();
  await expect(invite.getByText('18:00', { exact: false })).toBeVisible();
  await page.waitForTimeout(1800);
  expect((await readLab(page)).invitation.pizzaStarted).toBe(false);
  await expect.poll(async () => (await readLab(page)).invitation.pizzaStarted, { timeout: 4000 }).toBe(true);
  expect((await readLab(page)).invitation.elapsed).toBeGreaterThanOrEqual(3);
  await expect.poll(async () => (await readLab(page)).invitation.pizzaSettled).toBe(true);
  expect((await readLab(page)).invitation.pizzaX).toBeCloseTo(0);
  await page.screenshot({ path: testInfo.outputPath('invitation-desktop.png') });

  await page.getByRole('button', { name: /^replay experience$/i }).click();
  await phase(page, 'exterior');
  await page.getByRole('button', { name: /^view invitation$/i }).click();
  await phase(page, 'invitation');
});

test.describe('portrait touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test('actual captured touch drags and three dough taps finish the pizza without page scrolling', async ({ page, context }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.screenshot({ path: testInfo.outputPath('exterior-mobile.png') });
    await enter(page);
    const client = await context.newCDPSession(page);
    async function drag(ingredient: Ingredient) {
      const from = await project(page, ingredient);
      const to = await project(page, 'target');
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, radiusX: 9, radiusY: 9, force: 1 }] });
      for (let step = 1; step <= 10; step++) {
        const progress = step / 10;
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress, radiusX: 9, radiusY: 9, force: 1 }] });
        await page.waitForTimeout(16);
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await drag('sauce');
    expect((await readLab(page)).game.state).toBe('move');
    await drag('dough');
    await expect.poll(async () => (await readLab(page)).game.state).toBe('flatten');
    for (let taps = 1; taps <= 3; taps++) {
      const target = await project(page, 'target');
      await page.touchscreen.tap(target.x, target.y);
      await expect.poll(async () => (await readLab(page)).game.taps).toBe(taps);
      await page.waitForTimeout(120);
    }
    await drag('sauce');
    await expect.poll(async () => (await readLab(page)).game.state).toBe('cheese');
    await drag('cheese');
    await expect.poll(async () => (await readLab(page)).game.state).toBe('ready');
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.waitForTimeout(700);
    await page.screenshot({ path: testInfo.outputPath('kitchen-mobile-complete.png') });
    await page.getByRole('button', { name: /click to bake/i }).click();
    await phase(page, 'invitation');
    await expect.poll(async () => (await readLab(page)).invitation.pizzaSettled).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('invitation-mobile.png') });
    await client.detach();
  });
});

test('all scenes fit small portrait, landscape, tablet, and desktop without overflow', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of [
    { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 844, height: 390 },
    { width: 768, height: 1024 }, { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await open(page);
    await expect(page.getByRole('button', { name: /tap to enter/i })).toBeInViewport();
    for (const scene of ['exterior', 'kitchen', 'invitation']) {
      if (scene === 'kitchen') await enter(page);
      if (scene === 'invitation') {
        await page.getByRole('button', { name: /^view invitation$/i }).click();
        await phase(page, 'invitation');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
      if (scene === 'kitchen') {
        const ingredientHits = await page.evaluate(() => {
          const lab = (window as unknown as { __PIZZA_LAB__: LabState }).__PIZZA_LAB__;
          return (['dough', 'sauce', 'cheese', 'target'] as const).map(id => {
            const point = lab.project(id);
            return { id, inViewport: point.x >= 0 && point.x <= innerWidth && point.y >= 0 && point.y <= innerHeight, canvasTarget: document.elementFromPoint(point.x, point.y)?.id === 'world' };
          });
        });
        for (const hit of ingredientHits) {
          expect(hit.inViewport, `${hit.id} visible at ${viewport.width}×${viewport.height}`).toBe(true);
          expect(hit.canvasTarget, `${hit.id} pointer target unobstructed at ${viewport.width}×${viewport.height}`).toBe(true);
        }
      }
      await page.screenshot({ path: testInfo.outputPath(`${scene}-${viewport.width}x${viewport.height}.png`) });
      if (scene === 'kitchen') await expect(page.getByRole('button', { name: /^place the dough$/i })).toBeInViewport();
      if (scene === 'invitation') {
        await expect(page.getByRole('button', { name: /^replay experience$/i })).toBeInViewport();
        await expect(page.getByRole('region', { name: 'Invitation', exact: true }).getByText(/saturday, 5 december 2026/i)).toBeVisible();
      }
    }
  }
});

test('reduced motion skips travel and retains the three-second invitation delay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  expect((await readLab(page)).reducedMotion).toBe(true);
  await page.getByRole('button', { name: /tap to enter/i }).press('Enter');
  await phase(page, 'kitchen', 1500);
  await completeWithButtons(page, true);
  await page.getByRole('button', { name: /click to bake/i }).press('Enter');
  // The 250ms animation is followed by the first invitation render; software WebGL
  // shader compilation can block browser scheduling beyond that animation duration.
  await phase(page, 'invitation', 5000);
  expect((await readLab(page)).kitchenPizzaX).toBeCloseTo(7.3);
  expect((await readLab(page)).invitation.pizzaStarted).toBe(false);
  await expect.poll(async () => (await readLab(page)).invitation.pizzaSettled, { timeout: 5000 }).toBe(true);
  expect((await readLab(page)).invitation.elapsed).toBeGreaterThanOrEqual(3);
});

test('fixed quality controls change applied rendering cost and export real local measurements', async ({ page }) => {
  await open(page, '/?perf=1');
  const panel = page.getByRole('complementary', { name: 'Performance benchmark' });
  await expect(panel).toBeVisible();
  const select = page.getByLabel('Quality preset');
  await select.selectOption('high');
  await expect.poll(async () => (await readLab(page)).benchmark.appliedQuality).toBe('high');
  expect((await readLab(page)).benchmark.appliedPixelRatio).toBeLessThanOrEqual(1.75);
  await select.selectOption('low');
  await expect.poll(async () => (await readLab(page)).benchmark.appliedQuality).toBe('low');
  await expect.poll(async () => (await readLab(page)).benchmark.averageFps).toBeGreaterThan(0);
  const reading = (await readLab(page)).benchmark;
  expect(reading.appliedPixelRatio).toBeLessThanOrEqual(1);
  expect(reading.drawCalls).toBeGreaterThan(0);
  expect(reading.triangles).toBeGreaterThan(0);
  expect(reading.renderWidth).toBeGreaterThan(0);
  expect(reading.p95FrameMs).toBeGreaterThan(0);
  expect(reading.firstInteractiveFrameMs).toBeGreaterThan(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export benchmark json/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mikes-pizza-benchmark-.*\.json$/);
  const report = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(report.formatVersion).toBe(1);
  expect(report.current.appliedQuality).toBe('low');
  expect(report.current.drawCalls).toBeGreaterThan(0);
  expect(report.history.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Close benchmark panel' }).click();
  await expect(panel).toBeHidden();
  await page.getByRole('button', { name: 'Toggle performance benchmark panel' }).click();
  await expect(panel).toBeVisible();
});

test('unsupported WebGL shows useful invitation details', async ({ page }) => {
  await page.goto('/?webgl=0');
  await phase(page, 'fallback');
  const fallback = page.getByRole('region', { name: 'Invitation fallback' });
  await expect(fallback.getByText(/saturday, 5 december 2026/i)).toBeVisible();
  await expect(fallback.getByText('18:00', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /try 3d again/i })).toBeVisible();
});

test('WebGL context loss preserves readable invitation details', async ({ page }) => {
  await open(page);
  await page.evaluate(() => (window as unknown as { __PIZZA_LAB__: LabState }).__PIZZA_LAB__.loseContext());
  await phase(page, 'fallback');
  const fallback = page.getByRole('region', { name: 'Invitation fallback' });
  await expect(fallback.getByText(/saturday, 5 december 2026/i)).toBeVisible();
  await expect(fallback.getByText('18:00', { exact: true })).toBeVisible();
});

test('failed procedural texture creation falls back without an uncaught exception', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, options?: unknown) {
      if (kind === '2d') return null;
      return Reflect.apply(original, this, [kind, options]);
    } as typeof original;
  });
  await page.goto('/');
  await phase(page, 'fallback');
  const fallback = page.getByRole('region', { name: 'Invitation fallback' });
  await expect(fallback.getByText(/saturday, 5 december 2026/i)).toBeVisible();
  await expect(fallback.getByText('18:00', { exact: true })).toBeVisible();
});

test.describe('static invitation fallback', () => {
  test.use({ javaScriptEnabled: false });

  test('event details remain visible when JavaScript is disabled or the app cannot execute', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /mike.*pizza party/i })).toBeVisible();
    await expect(page.getByText(/saturday, 5 december 2026/i)).toBeVisible();
    await expect(page.getByText('18:00', { exact: true })).toBeVisible();
    await expect(page.getByText(/enable javascript to step inside/i)).toBeVisible();
  });
});

test.describe('hero atmosphere', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  test('rain uses a fixed budget and neon has visible brightness dips, with quality and motion guards', async ({ page }, testInfo) => {
    await open(page, '/?perf=1&quality=balanced');
    await expect(page.getByRole('navigation', { name: 'Experience progress' })).toHaveCount(0);
    await expect(page.getByText('A NEW YORK KIND OF NIGHT', { exact: true })).toHaveCount(0);
    await expect(page.getByText('A LITTLE DOUGH. A NIGHT TO REMEMBER.', { exact: true })).toHaveCount(0);
    await expect.poll(async () => (await readLab(page)).atmosphere.rainDrops).toBe(96);
    const initial = await readLab(page);
    const lightLevels: number[] = [];
    for (let sample = 0; sample < 18; sample++) {
      await page.waitForTimeout(100);
      lightLevels.push((await readLab(page)).atmosphere.lightLevel);
    }
    const moving = await readLab(page);
    expect(moving.atmosphere.rainTime).toBeGreaterThan(initial.atmosphere.rainTime + .5);
    expect(moving.atmosphere.rainVertices).toBe(192);
    expect(moving.benchmark.geometries).toBe(initial.benchmark.geometries);
    expect(Math.max(...lightLevels) - Math.min(...lightLevels)).toBeGreaterThan(.35);
    expect(Math.min(...lightLevels)).toBeLessThan(.6);
    expect(Math.min(...lightLevels)).toBeGreaterThan(.2);
    expect(Math.max(...lightLevels)).toBeGreaterThan(.94);
    expect(Math.max(...lightLevels)).toBeLessThan(1.03);

    await page.getByRole('button', { name: 'Close benchmark panel' }).click();
    await page.screenshot({ path: testInfo.outputPath('hero-rain-mobile.png') });
    await page.getByRole('button', { name: 'Toggle performance benchmark panel' }).click();
    await page.getByLabel('Quality preset').selectOption('high');
    await expect.poll(async () => (await readLab(page)).atmosphere.rainDrops).toBe(192);
    expect((await readLab(page)).atmosphere.rainVertices).toBe(384);
    await page.getByLabel('Quality preset').selectOption('low');
    await expect.poll(async () => (await readLab(page)).atmosphere.rainDrops).toBe(0);
    await page.getByLabel('Quality preset').selectOption('high');
    await expect.poll(async () => (await readLab(page)).atmosphere.rainDrops).toBe(192);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(async () => (await readLab(page)).atmosphere.rainDrops).toBe(0);
    expect((await readLab(page)).atmosphere.lightLevel).toBe(1);
    await page.getByRole('button', { name: 'Close benchmark panel' }).click();
    await enter(page);
    expect((await readLab(page)).atmosphere.rainDrops).toBe(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(150);
    expect((await readLab(page)).atmosphere.rainDrops).toBe(0);
    expect((await readLab(page)).atmosphere.lightLevel).toBe(1);
  });
});
