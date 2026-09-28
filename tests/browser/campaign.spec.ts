import { test, expect } from '@playwright/test';

test('ten complete shifts unlock ten stories and continue into daily life', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.locator('#new-run-btn').click();
  await expect(page.locator('#pause-screen')).toHaveClass(/active/, {
    timeout: 30_000,
  });
  for (let day = 1; day <= 10; day++) {
    await expect
      .poll(async () =>
        page.evaluate(
          () => (window as any).getRoboCleanEngine()?.isPreparingDay,
        ),
      )
      .toBe(false);
    const result = await page.evaluate(() => {
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
        for (let pass = 0; pass < 10 && spot.currentStep !== 'done'; pass++) {
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
      dock();
      const save = JSON.parse(localStorage.getItem('robot-vacuum-save')!);
      return {
        day: engine.day,
        phase: engine.mission.phase,
        remaining:
          engine.dirtSpawner.getRemainingCount() +
          engine.dustSpawner.getActiveCount(),
        savedDays: save.completedDays,
        report: save.pendingReport,
        reachable: engine.navigation.points.length,
      };
    });
    expect(result.day).toBe(day);
    expect(result.phase).toBe('complete');
    expect(result.remaining).toBe(0);
    expect(result.savedDays).toContain(day);
    expect(result.savedDays).toHaveLength(day);
    expect(result.report.day).toBe(day);
    expect(result.reachable).toBeGreaterThan(10);
    await expect(page.locator('#story-screen')).toHaveClass(/active/);
    await expect(page.locator('#story-content .dialogue-line')).toHaveCount(
      day === 8 || day > 10 ? 2 : 3,
    );
    if (day === 2 || day === 10)
      await page.screenshot({ path: `test-results/story-day-${day}.png` });
    await page.locator('#next-day-btn').click();
    await expect(page.locator('#day-counter')).toHaveText(
      `Ngày ${String(day + 1).padStart(2, '0')}`,
    );
  }
  await expect(page.locator('#pause-screen')).toHaveClass(/active/);
  await page.locator('#pause-screen .journal-open').click();
  await expect(page.locator('#journal-days button')).toHaveCount(10);
  await expect(page.locator('#journal-entry')).toContainText(
    'Một chỗ để trở về',
  );
  await page.screenshot({ path: 'test-results/journal.png' });
  expect(errors).toEqual([]);
});
