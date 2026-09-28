import { test, expect } from '@playwright/test';

test('workshop dashboard, persistent settings, empty journal, and small screen layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#continue-btn')).toBeDisabled();
  await expect(page.getByRole('heading', { name: /Nhà sạch/ })).toBeVisible();
  await expect(page.locator('.assembly-board img')).toBeVisible();
  expect(
    await page
      .locator('.assembly-board img')
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBe(700);
  await page.screenshot({ path: 'test-results/workshop.png', fullPage: true });
  await page.locator('.hub-journal .journal-open').click();
  await expect(page.locator('#journal-entry')).toContainText(
    'Những trang chưa viết.',
  );
  await expect(page.locator('#journal-days button')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#journal-dialog')).not.toBeVisible();
  await page.locator('.masthead .settings-open').click();
  await page.locator('#setting-music').uncheck();
  await page.locator('#setting-sfx').uncheck();
  await page.locator('#setting-camera').selectOption('overhead');
  await page.locator('#setting-invert').check();
  await page.locator('#setting-motion').check();
  await page.locator('#setting-outlines').uncheck();
  await page.locator('#setting-fov').fill('80');
  await page.locator('#setting-volume').fill('30');
  await expect(page.locator('#volume-value')).toHaveText('30%');
  await page.screenshot({ path: 'test-results/settings.png' });
  await page.reload();
  await page.locator('.masthead .settings-open').click();
  await expect(page.locator('#setting-music')).not.toBeChecked();
  await expect(page.locator('#setting-invert')).toBeChecked();
  await expect(page.locator('#setting-motion')).toBeChecked();
  await expect(page.locator('#setting-camera')).toHaveValue('overhead');
  await expect(page.locator('#setting-fov')).toHaveValue('80');
  await expect(page.locator('#setting-volume')).toHaveValue('30');
  await page.locator('#settings-reset').click();
  await expect(page.locator('#setting-volume')).toHaveValue('80');
  await expect(page.locator('#setting-camera')).toHaveValue('follow');
  await page.locator('#settings-dialog .dialog-close').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/workshop-mobile.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator('.masthead .settings-open').click();
  const bounds = await page.locator('#settings-dialog').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});

test('camera modes and zoom work in game, settings pause simulation, dirt has purposeful outlines', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#new-run-btn').click();
  await expect(page.locator('#pause-screen')).toHaveClass(/active/, {
    timeout: 30_000,
  });
  const original = await page.evaluate(() => {
    const engine = (window as any).getRoboCleanEngine();
    engine.husky.update = () => {};
    engine.husky.group.position.set(999, 0, 999);
    return {
      boom: engine.robot.getDefaultCameraBoomDistance(),
      fov: engine.robot.camera.fov,
    };
  });
  await page.locator('#resume-btn').click();
  await page.keyboard.press('KeyC');
  await expect(page.locator('#camera-mode-btn')).toHaveText('Cam: Từ trên');
  expect(
    await page.evaluate(
      () => (window as any).getRoboCleanEngine().robot.getCameraSettings().mode,
    ),
  ).toBe('overhead');
  await page.screenshot({ path: 'test-results/overhead.png' });
  await page.keyboard.press('KeyC');
  await page.mouse.wheel(0, 250);
  await expect
    .poll(async () =>
      page.evaluate(() =>
        (window as any)
          .getRoboCleanEngine()
          .robot.getDefaultCameraBoomDistance(),
      ),
    )
    .toBeGreaterThan(original.boom);
  await page.keyboard.press('Home');
  await expect
    .poll(async () =>
      page.evaluate(() =>
        (window as any)
          .getRoboCleanEngine()
          .robot.getDefaultCameraBoomDistance(),
      ),
    )
    .toBe(original.boom);
  await page.keyboard.press('Tab');
  await expect(page.locator('#settings-dialog')).toBeVisible();
  await page.locator('#setting-fov').fill('82');
  expect(
    await page.evaluate(
      () => (window as any).getRoboCleanEngine().robot.camera.fov,
    ),
  ).toBe(82);
  const battery = await page.evaluate(
    () => (window as any).getRoboCleanEngine().gameState.battery,
  );
  await page.keyboard.press('KeyW');
  expect(
    await page.evaluate(
      () => (window as any).getRoboCleanEngine().gameState.battery,
    ),
  ).toBe(battery);
  await page.locator('#settings-dialog .dialog-close').click();
  const outline = await page.evaluate(() => {
    const engine = (window as any).getRoboCleanEngine();
    const spot = engine.dirtSpawner.spots[0];
    engine.currentPosition.copy(spot.mesh.position);
    engine.input.reset();
    engine.handleCleaning(1, 'test');
    const active = spot.mesh.userData.outline;
    return {
      visible: active.visible,
      opacity: active.material.opacity,
      vertexCount: active.geometry.getAttribute('position').count,
    };
  });
  expect(outline.visible).toBe(true);
  expect(outline.opacity).toBe(0.95);
  expect(outline.vertexCount).toBeGreaterThan(8);
  await expect(page.locator('#action')).toContainText('Giữ E');
  await page.evaluate(() => {
    const engine = (window as any).getRoboCleanEngine();
    const spot = engine.dirtSpawner.spots[0];
    const point = engine.navigation.points.find((point: any) => point.distanceTo(spot.mesh.position) > .25 && point.distanceTo(spot.mesh.position) < .4);
    engine.robot.spawn(...(point ?? spot.mesh.position.clone().setY(engine.floorY)).toArray());
    engine.robot.cameraGroup.rotation.y = Math.atan2(engine.robot.group.position.x - spot.mesh.position.x, engine.robot.group.position.z - spot.mesh.position.z);
    engine.needsRender = true;
  });
  await page.locator('#resume-btn').click();
  await expect(page.locator('#pause-screen')).not.toHaveClass(/active/);
  await page.screenshot({ path: 'test-results/target-outline.png' });
});
