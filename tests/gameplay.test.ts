import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MissionSystem } from '../src/systems/MissionSystem';
import { NavigationGrid } from '../src/systems/NavigationGrid';
import { DirtSpawner, DIRT_CONFIGS } from '../src/systems/DirtSpawner';
import type { DirtSpot } from '../src/systems/DirtSpawner';
import { DustSpawner } from '../src/systems/DustSpawner';
import { findCharacterClip } from '../src/core/CharacterAnimator';
import { Robot } from '../src/entities/Robot';
import { MOVE_SPEED } from '../src/utils/constants';
import { InputManager } from '../src/core/InputManager';
import { CollisionWorld } from '../src/systems/CollisionWorld';
import { createStaticBatch } from '../src/core/StaticBatch';
import {
  sanitizeSettings,
  defaultSettings,
} from '../src/systems/SettingsStore';
import { SaveManager } from '../src/systems/SaveManager';
import { getDayStory } from '../src/systems/StorySystem';

test('a shift requires both types of mess and a final dock visit', () => {
  const mission = new MissionSystem();
  mission.begin(2, 3);
  mission.update(2, 2, true);
  assert.equal(mission.phase, 'cleaning');
  mission.update(2, 3, false);
  assert.equal(mission.phase, 'returning');
  mission.update(2, 3, true);
  assert.equal(mission.phase, 'complete');
  mission.reset();
  mission.update(0, 0, true);
  assert.equal(mission.phase, 'loading');
});

test('empty rooms cannot auto-complete or advance repeatedly', () => {
  const mission = new MissionSystem();
  mission.begin(0, 0);
  mission.update(0, 0, true);
  assert.equal(mission.phase, 'loading');
  mission.begin(0, 2);
  mission.update(0, 2, true);
  assert.equal(mission.phase, 'complete');
});

test('navigation excludes disconnected rooms and missing floor', () => {
  const navigation = new NavigationGrid();
  const bounds = new THREE.Box3(
    new THREE.Vector3(-1, 0, -1),
    new THREE.Vector3(1, 1, 1),
  );
  navigation.build(
    new THREE.Vector3(),
    bounds,
    (x, z) => (z > 0.6 ? undefined : 0),
    (from, to) => !(from.x <= 0 && to.x > 0),
  );
  assert(navigation.points.length > 1);
  assert(navigation.points.every((point) => point.x <= 0 && point.z <= 0.6));
});

test('a blocked navigation edge still allows reaching a cell by another route', () => {
  const navigation = new NavigationGrid();
  const bounds = new THREE.Box3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.7, 1, 0.7),
  );
  navigation.build(
    new THREE.Vector3(),
    bounds,
    () => 0,
    (from, to) => !(from.z === 0 && to.z === 0 && from.x !== to.x),
  );
  assert(
    navigation.points.some(
      (point) => point.x === navigation.spacing && point.z === 0,
    ),
  );
});

test('collision buckets include meshes spanning cell edges and refresh on day reset', () => {
  const world = new CollisionWorld();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.1));
  const distant = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  distant.position.set(10, 0, 10);
  world.rebuild([wall, distant]);
  assert(world.at(-0.9, 0).includes(wall));
  assert(world.at(0.9, 0).includes(wall));
  assert(!world.at(0, 0).includes(distant));
  assert(
    world
      .along(new THREE.Vector3(-2, 0, 0), new THREE.Vector3(1, 0, 0), 4)
      .includes(wall),
  );
  world.rebuild([distant]);
  assert.equal(world.at(0, 0).length, 0);
});

test('static batching preserves world placement and combines shared materials', () => {
  const source = new THREE.Group();
  source.position.set(2, 0, 1);
  source.scale.setScalar(1.5);
  const material = new THREE.MeshStandardMaterial();
  const first = new THREE.Mesh(new THREE.BoxGeometry(), material);
  const second = new THREE.Mesh(new THREE.BoxGeometry(), material);
  second.position.x = 2;
  source.add(first, second);
  const before = new THREE.Box3().setFromObject(source);
  const result = createStaticBatch(source);
  const after = new THREE.Box3().setFromObject(result);
  assert.equal(result.children.length, 1);
  assert(before.min.distanceTo(after.min) < 1e-6);
  assert(before.max.distanceTo(after.max) < 1e-6);
  assert.equal(first.geometry.getAttribute('position').count, 24);
});

function makeSpot(configIndex: number): DirtSpot {
  const config = DIRT_CONFIGS[configIndex];
  return {
    config,
    mesh: new THREE.Mesh(
      new THREE.PlaneGeometry(),
      new THREE.MeshStandardMaterial(),
    ),
    remainingActions: config.requiredActions,
    currentStep: config.method === 'mop' ? 'needs_mop' : 'needs_sweep',
    cleaning: false,
  };
}

test('mixed grime needs sweep before mop and disposes the spot only once', () => {
  const spawner = new DirtSpawner();
  const spot = makeSpot(5);
  let disposals = 0;
  spot.mesh.geometry.addEventListener('dispose', () => disposals++);
  (spawner as any).spots.push(spot);
  spawner.group.add(spot.mesh);
  assert.equal(spawner.applyMop(spot), 'wrong_tool');
  assert.equal(spot.remainingActions, 3);
  assert.equal(spawner.applySweep(spot), 'progress');
  assert.equal(spot.currentStep, 'needs_mop');
  assert.equal(spawner.applySweep(spot), 'wrong_tool');
  assert.equal(spawner.applyMop(spot), 'progress');
  assert.equal(spawner.applyMop(spot), 'cleaned');
  assert.equal(spawner.getRemainingCount(), 0);
  spawner.clearAll();
  assert.equal(disposals, 1);
});

test('targeting prefers the selected tool and respects line of sight', () => {
  const spawner = new DirtSpawner();
  const dry = makeSpot(0);
  const wet = makeSpot(2);
  dry.mesh.position.x = 0.2;
  wet.mesh.position.x = 0.3;
  (spawner as any).spots.push(dry, wet);
  assert.equal(
    spawner.findNearestSpot(new THREE.Vector3(), undefined, 'needs_mop'),
    wet,
  );
  assert.equal(
    spawner.findNearestSpot(new THREE.Vector3(), (spot) => spot !== dry),
    wet,
  );
  assert.equal(
    spawner.findNearestSpot(new THREE.Vector3(), () => false),
    null,
  );
});

test('restarting while textures load cancels the previous spawn generation', async () => {
  const spawner = new DirtSpawner();
  const pending: Array<() => void> = [];
  (spawner as any).loadTexture = (path: string) =>
    new Promise((resolve) =>
      pending.push(() => {
        const texture = new THREE.Texture();
        (spawner as any).textureCache.set(path, texture);
        resolve(texture);
      }),
    );
  const points = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(2, 0, 0),
    new THREE.Vector3(3, 0, 0),
  ];
  const oldDay = spawner.spawnForDay(1, 0, [], undefined, undefined, points);
  const newDay = spawner.spawnForDay(2, 0, [], undefined, undefined, points);
  pending.forEach((resolve) => resolve());
  const [cancelled, current] = await Promise.all([oldDay, newDay]);
  assert.equal(cancelled.length, 0);
  assert(current.length > 0);
  assert.equal(spawner.group.children.length, current.length);
});

test('dust respects storage capacity and stays collected after a long pause', () => {
  const dust = new DustSpawner(new THREE.Scene());
  dust.spawnForDay(1, 0, 0xffffff, undefined, [new THREE.Vector3()]);
  const total = dust.getTotalCount();
  assert.equal(dust.checkCollision(new THREE.Vector3(), true, 3), 3);
  assert.equal(dust.getActiveCount(), total - 3);
  dust.update(100);
  assert.equal(dust.getActiveCount(), total - 3);
  assert.equal(
    dust.checkCollision(new THREE.Vector3(), true, 100, () => false),
    0,
  );
  dust.clearAll();
  dust.update(10);
  assert.equal(dust.getActiveCount(), 0);
});

test('clip mapping selects Gallop and safe Idle rather than jump or hit reaction', () => {
  const clips = [
    'Death',
    'Gallop_Jump',
    'Idle_HitReact_Left',
    'Gallop',
    'Idle',
  ].map((name) => new THREE.AnimationClip(name, 1, []));
  assert.equal(findCharacterClip(clips, 'run')?.name, 'Gallop');
  assert.equal(findCharacterClip(clips, 'idle')?.name, 'Idle');
  assert.equal(findCharacterClip(clips, 'lie'), undefined);
  assert.equal(
    findCharacterClip(
      [new THREE.AnimationClip('RatArmature|Rat_Walk', 1, [])],
      'walk',
    )?.name,
    'RatArmature|Rat_Walk',
  );
});

test('robot diagonal speed matches forward speed and movement uses seconds', () => {
  (globalThis as any).window = { innerWidth: 1280, innerHeight: 720 };
  const run = (diagonal: boolean, fps: number) => {
    const robot = new Robot();
    const input = {
      forward: true,
      right: diagonal,
      mouseDeltaX: 0,
      mouseDeltaY: 0,
    } as any;
    for (let frame = 0; frame < fps; frame++)
      robot.group.position.copy(robot.update(1 / fps, input, MOVE_SPEED));
    return robot.group.position.length();
  };
  assert(Math.abs(run(false, 60) - run(true, 60)) < 1e-6);
  assert(Math.abs(run(false, 30) - run(false, 144)) < 0.025);
  assert(run(false, 60) > 1.4);
});

test('pause clears held movement, tools, and pending mouse deltas', () => {
  const input = Object.create(InputManager.prototype) as any;
  input.state = {
    isLocked: false,
    forward: true,
    suction: true,
    mop: true,
    mouseDeltaX: 15,
    mouseDeltaY: -8,
  };
  input.reset();
  assert.deepEqual(input.state, {
    isLocked: false,
    forward: false,
    suction: false,
    mop: false,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
  });
  input.setKey('KeyE', true);
  input.setKey('KeyR', true);
  assert.equal(input.state.suction, false);
  assert.equal(input.state.mop, true);
});

test('settings reject malformed values and clamp camera and volume bounds', () => {
  const settings = sanitizeSettings({
    sensitivity: Infinity,
    fov: 500,
    volume: -20,
    invertY: 'yes' as any,
    cameraMode: 'broken' as any,
  });
  assert.equal(settings.sensitivity, 1);
  assert.equal(settings.fov, 84);
  assert.equal(settings.volume, 0);
  assert.equal(settings.invertY, false);
  assert.equal(settings.cameraMode, 'follow');
});

test('camera mode switches retain yaw, zoom clamps, and reset preserves user FOV', () => {
  (globalThis as any).window = { innerWidth: 1280, innerHeight: 720 };
  const robot = new Robot();
  robot.cameraGroup.rotation.y = 1.25;
  robot.applySettings({
    ...defaultSettings(),
    cameraMode: 'overhead',
    fov: 82,
  });
  assert.equal(robot.cameraGroup.rotation.y, 1.25);
  assert(robot.getCameraSettings().height > 1);
  robot.zoomCamera(100000);
  assert(robot.getCameraSettings().height <= 1.8);
  robot.resetCameraView();
  assert.equal(robot.camera.fov, 82);
  robot.applySettings({ ...defaultSettings(), cameraMode: 'follow' });
  robot.zoomCamera(-100000);
  assert.equal(robot.getDefaultCameraBoomDistance(), 0.45);
});

test('reports and explicit journal unlocks survive save validation without unlocking unfinished days', () => {
  const values = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  const data = {
    battery: 60,
    cleanedCount: 7,
    day: 3,
    money: 0,
    highestDay: 5,
    version: '1.0.0',
    timestamp: Date.now(),
    playtime: 0,
    completedDays: [1, 3, 3, -1, 5000],
    pendingReport: { day: 3, stains: 7, dust: 29, battery: 60 },
  };
  SaveManager.save(data);
  const loaded = SaveManager.load()!;
  assert.deepEqual(loaded.completedDays, [1, 3]);
  assert.deepEqual(loaded.pendingReport, data.pendingReport);
  SaveManager.save({ ...loaded, day: 4 });
  assert.equal(SaveManager.load()!.pendingReport, undefined);
  values.set(
    'robot-vacuum-save',
    JSON.stringify({
      ...data,
      completedDays: undefined,
      pendingReport: undefined,
    }),
  );
  assert.deepEqual(SaveManager.load()!.completedDays, [1, 2, 3, 4]);
  delete (globalThis as any).localStorage;
});

test('the first ten stories are distinct, complete, and alternate humor with quiet days', () => {
  const stories = Array.from({ length: 10 }, (_, day) => getDayStory(day + 1));
  assert.equal(new Set(stories.map((story) => story.title)).size, 10);
  stories.forEach((story) => {
    assert.equal(story.paragraphs.length, 2);
    assert(story.dialogue.length >= 2);
    assert(story.robotNote.length > 40);
    assert(story.mission.length > 30);
  });
  assert.deepEqual(
    stories.slice(0, 9).map((story) => story.mood),
    ['vui', 'buồn', 'vui', 'buồn', 'vui', 'buồn', 'vui', 'buồn', 'vui'],
  );
  assert.equal(getDayStory(11).mood, 'vui');
  assert.equal(getDayStory(12).mood, 'buồn');
});
