import { test, expect } from '@playwright/test';

test('loads a reachable mission, pauses safely, and completes the shift at the dock', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(message.text());
  });
  await page.goto('/');
  await page.locator('#new-run-btn').click();
  await expect(page.locator('#pause-screen')).toHaveClass(/active/, {
    timeout: 30_000,
  });
  await expect(page.locator('#objectives')).toContainText('Vết bẩn', {
    timeout: 30_000,
  });
  const initial = await page.evaluate(async () => {
    const engine = (window as any).getRoboCleanEngine();
    return {
      day: engine.day,
      stains: engine.gameState.totalCells,
      dust: engine.dustSpawner.getTotalCount(),
      reachable: engine.navigation.points.length,
      battery: engine.gameState.battery,
    };
  });
  expect(initial.stains).toBeGreaterThan(0);
  expect(initial.dust).toBeGreaterThan(0);
  expect(initial.reachable).toBeGreaterThan(1);
  expect(initial.reachable).toBeGreaterThan(30);
  expect(initial.day).toBe(1);
  await page.keyboard.press('KeyW');
  const pausedBattery = await page.evaluate(
    () => (window as any).getRoboCleanEngine().gameState.battery,
  );
  expect(pausedBattery).toBe(initial.battery);
  await page.screenshot({ path: 'test-results/paused.png' });
  await page.locator('#resume-btn').click();
  await expect(page.locator('#pause-screen')).not.toHaveClass(/active/);
  await page.keyboard.down('KeyW');
  await expect
    .poll(async () =>
      page.evaluate(
        () => (window as any).getRoboCleanEngine().gameState.battery,
      ),
    )
    .toBeLessThan(initial.battery);
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: 'test-results/playing.png' });
  await page.evaluate(() => document.exitPointerLock());
  await expect(page.locator('#pause-screen')).toHaveClass(/active/);
  const cleared = await page.evaluate(async () => {
    const engine = (window as any).getRoboCleanEngine();
    return {
      forward: engine.input.state.forward,
      sweep: engine.input.state.suction,
      mouse: engine.input.state.mouseDeltaX,
    };
  });
  expect(cleared).toEqual({ forward: false, sweep: false, mouse: 0 });

  // Drive the real cleaning interaction at every spawned position. The browser
  // stays paused so frame timing and random animal behavior cannot race this check.
  const completed = await page.evaluate(async () => {
    const engine = (window as any).getRoboCleanEngine();
    engine.husky.update = () => {};
    engine.husky.group.position.set(999, 0, 999);
    const dock = () => {
      engine.input.reset();
      engine.robot.spawn(...engine.robotSpawn.toArray());
      engine.updateGame(1 / 60, performance.now());
    };
    for (const particle of engine.dustSpawner.particles) {
      if (!particle.active) continue;
      if (engine.gameState.isStorageFull()) dock();
      engine.robot.spawn(
        particle.mesh.position.x,
        engine.floorY,
        particle.mesh.position.z,
      );
      engine.currentPosition.copy(engine.robot.group.position);
      engine.input.state.suction = true;
      engine.actionCooldown = 0;
      engine.handleCleaning(1, 'test');
    }
    for (const spot of engine.dirtSpawner.spots) {
      let guard = 0;
      while (spot.currentStep !== 'done' && guard++ < 10) {
        if (engine.gameState.isStorageFull()) dock();
        engine.robot.spawn(
          spot.mesh.position.x,
          engine.floorY,
          spot.mesh.position.z,
        );
        engine.currentPosition.copy(engine.robot.group.position);
        engine.input.state.suction = spot.currentStep === 'needs_sweep';
        engine.input.state.mop = spot.currentStep === 'needs_mop';
        engine.actionCooldown = 0;
        engine.handleCleaning(1, 'test');
      }
    }
    engine.mission.update(
      engine.gameState.cleanedCells,
      engine.dustSpawner.getTotalCount() - engine.dustSpawner.getActiveCount(),
      false,
    );
    const beforeDock = engine.mission.phase;
    const remaining =
      engine.dirtSpawner.getRemainingCount() +
      engine.dustSpawner.getActiveCount();
    dock();
    return {
      beforeDock,
      remaining,
      day: engine.day,
      storage: engine.gameState.storage,
    };
  });
  expect(completed.remaining).toBe(0);
  expect(completed.beforeDock).toBe('returning');
  expect(completed.day).toBe(1);
  expect(completed.storage).toBe(0);
  await expect(page.locator('#story-screen')).toHaveClass(/active/);
  await expect(page.locator('#story-title')).toHaveText('Một thành viên mới');
  await page.screenshot({ path: 'test-results/story-day-1.png' });
  const beforeReading = await page.evaluate(
    () => (window as any).getRoboCleanEngine().gameState.battery,
  );
  await page.keyboard.press('KeyW');
  expect(
    await page.evaluate(
      () => (window as any).getRoboCleanEngine().gameState.battery,
    ),
  ).toBe(beforeReading);
  await page.locator('#story-screen .journal-open').click();
  await expect(page.locator('#journal-entry')).toContainText(
    'Một thành viên mới',
  );
  await expect(page.locator('#journal-days button')).toHaveCount(1);
  await page.locator('#journal-dialog .dialog-close').click();
  // Pending reports and unlocked chapters survive a reload before advancing.
  await page.reload();
  await page.locator('#continue-btn').click();
  await expect(page.locator('#story-screen')).toHaveClass(/active/);
  await expect
    .poll(async () =>
      page.evaluate(() => (window as any).getRoboCleanEngine()?.isPreparingDay),
    )
    .toBe(false);
  await expect(page.locator('#story-title')).toHaveText('Một thành viên mới');
  await page.locator('#next-day-btn').click();
  await expect(page.locator('#story-screen')).not.toHaveClass(/active/);
  await expect(page.locator('#day-counter')).toHaveText('Ngày 02');
  await expect(page.locator('#objectives')).toContainText('Vết bẩn');
  await page.screenshot({ path: 'test-results/day-2.png' });

  // Repeat contact for half a second. Damage must be bounded by the cooldown.
  const damage = await page.evaluate(() => {
    const engine = (window as any).getRoboCleanEngine();
    engine.husky.update = () => {};
    engine.input.reset();
    engine.gameState.battery = 100;
    const point = engine.navigation.points.find(
      (candidate: any) => candidate.distanceTo(engine.robotSpawn) > 1,
    );
    engine.robot.spawn(...point.toArray());
    engine.huskyHitCooldown = 0;
    for (let frame = 0; frame < 30; frame++) {
      engine.husky.group.position.copy(engine.robot.group.position);
      engine.husky.group.position.x += 0.1;
      engine.updateGame(1 / 60, performance.now());
    }
    return {
      battery: engine.gameState.battery,
      cooldown: engine.huskyHitCooldown,
    };
  });
  expect(damage.battery).toBeGreaterThan(89);
  expect(damage.battery).toBeLessThanOrEqual(90);
  expect(damage.cooldown).toBeGreaterThan(0.9);

  await page.evaluate(() => {
    const engine = (window as any).getRoboCleanEngine();
    engine.day = 5;
    engine.gameState.day = 5;
    engine.restartDay();
  });
  await expect
    .poll(async () =>
      page.evaluate(() => (window as any).getRoboCleanEngine().isPreparingDay),
    )
    .toBe(false);
  const grime = await page.evaluate(() => {
    const engine = (window as any).getRoboCleanEngine();
    const spot = engine.dirtSpawner.spots.find(
      (candidate: any) => candidate.config.name === 'Heavy Grime',
    );
    const collect = engine.dustSpawner.checkCollision;
    engine.dustSpawner.checkCollision = () => 0;
    engine.robot.spawn(
      spot.mesh.position.x,
      engine.floorY,
      spot.mesh.position.z,
    );
    engine.currentPosition.copy(engine.robot.group.position);
    engine.input.state.suction = true;
    engine.actionCooldown = 0;
    engine.handleCleaning(1, 'test');
    const afterSweep = spot.currentStep;
    const remaining = spot.remainingActions;
    engine.actionCooldown = 0;
    engine.handleCleaning(1, 'test');
    const wrongToolPreserved = spot.remainingActions === remaining;
    engine.input.state.suction = false;
    engine.input.state.mop = true;
    for (let pass = 0; pass < remaining; pass++) {
      engine.actionCooldown = 0;
      engine.handleCleaning(1, 'test');
    }
    engine.dustSpawner.checkCollision = collect;
    return { afterSweep, wrongToolPreserved, final: spot.currentStep };
  });
  expect(grime).toEqual({
    afterSweep: 'needs_mop',
    wrongToolPreserved: true,
    final: 'done',
  });
  expect(errors).toEqual([]);
});
