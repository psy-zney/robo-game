import type { Engine } from './core/Engine';
import { sharedAudioManager } from './core/AudioManager';
import { SaveManager } from './systems/SaveManager';
import { settingsStore, type GameSettings } from './systems/SettingsStore';
import { getDayStory, type DayReport } from './systems/StorySystem';
import { hydrateJournal, setText } from './ui/StoryView';

let engine: Engine | null = null;
let starting = false;
export function getActiveEngine() {
  return engine;
}
if (import.meta.env.DEV)
  Object.assign(window, { getRoboCleanEngine: getActiveEngine });
sharedAudioManager.initOnUserGesture();
hydrateHub();
bindSettings();
bindButtons();
settingsStore.subscribe(applySettings);

function hydrateHub() {
  const save = SaveManager.load();
  const button = document.getElementById('continue-btn') as HTMLButtonElement;
  button.disabled = !save;
  setText(
    'continue-meta',
    save
      ? save.pendingReport
        ? `Ngày ${save.day} đã hoàn thành · Nhật ký đang chờ bạn.`
        : `Đã lưu đầu ngày ${save.day} · ${save.completedDays?.length ?? 0} trang nhật ký.`
      : 'Chưa có ca dọn được lưu.',
  );
  const nextDay = save?.day ?? 1;
  const nextStory = getDayStory(nextDay);
  setText('hub-chapter', nextStory.title);
  setText('hub-mission', nextStory.mission);
  document.querySelector('.plate-number')!.textContent = String(
    nextDay,
  ).padStart(2, '0');
  document.querySelector('.shift-preview .eyebrow')!.textContent = save
    ? 'Ca dọn đang chờ'
    : 'Ca dọn đầu tiên';
  const select = document.getElementById('replay-day') as HTMLSelectElement;
  const replay = document.getElementById('replay-btn') as HTMLButtonElement;
  select.replaceChildren();
  select.disabled = replay.disabled = !save;
  for (let day = 1; day <= (save?.highestDay ?? 1); day++) {
    const option = document.createElement('option');
    option.value = String(day);
    option.textContent = `Ngày ${day}`;
    select.append(option);
  }
  const preview = document.getElementById('chapter-preview')!;
  preview.replaceChildren();
  for (
    let day = Math.max(1, nextDay - 1);
    day < Math.max(1, nextDay - 1) + 3;
    day++
  ) {
    const block = document.createElement('div');
    block.className = 'chapter-peek';
    const label = document.createElement('span');
    label.textContent = `NGÀY ${String(day).padStart(2, '0')}`;
    const title = document.createElement('strong');
    title.textContent = getDayStory(day).title;
    const state = document.createElement('small');
    state.textContent = save?.completedDays?.includes(day)
      ? 'Đã lưu chuyện'
      : day === nextDay
        ? 'Đang chờ bạn'
        : 'Chưa mở';
    block.append(label, title, state);
    preview.append(block);
  }
}

function bindButtons() {
  document.getElementById('new-run-btn')!.addEventListener('click', () => {
    if (starting) return;
    SaveManager.clear();
    startGame({ startDay: 1 });
  });
  document.getElementById('continue-btn')!.addEventListener('click', () => {
    const save = SaveManager.load();
    if (save)
      startGame({ startDay: save.day, pendingReport: save.pendingReport });
  });
  document.getElementById('replay-btn')!.addEventListener('click', () => {
    const save = SaveManager.load();
    if (save)
      startGame({
        startDay: Math.max(
          1,
          Math.min(
            save.highestDay,
            Number(
              (document.getElementById('replay-day') as HTMLSelectElement)
                .value,
            ),
          ),
        ),
      });
  });
  document.getElementById('resume-btn')!.addEventListener('click', () => {
    void document.body.requestPointerLock();
  });
  document
    .getElementById('pause-btn')!
    .addEventListener('click', () => document.exitPointerLock());
  document
    .getElementById('restart-day-btn')!
    .addEventListener('click', () => engine?.restartDay());
  document.getElementById('next-day-btn')!.addEventListener('click', () => {
    void engine?.nextDay();
  });
  document
    .getElementById('reset-btn')!
    .addEventListener('click', () => engine?.resetCamera());
  document
    .getElementById('camera-mode-btn')!
    .addEventListener('click', toggleCamera);
  document
    .querySelectorAll('#home-btn, .home-link')
    .forEach((button) =>
      button.addEventListener('click', () => window.location.reload()),
    );
  document.querySelectorAll('.settings-open, .journal-open').forEach((button) =>
    button.addEventListener('click', () => {
      if (document.pointerLockElement) document.exitPointerLock();
      const journal = button.classList.contains('journal-open');
      if (journal) hydrateJournal();
      const dialog = document.getElementById(
        journal ? 'journal-dialog' : 'settings-dialog',
      ) as HTMLDialogElement;
      dialog.showModal();
    }),
  );
  document
    .querySelectorAll('.dialog-close')
    .forEach((button) =>
      button.addEventListener('click', () =>
        (button.closest('dialog') as HTMLDialogElement).close(),
      ),
    );
  document.querySelectorAll('dialog').forEach((dialog) =>
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        const bounds = dialog.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          dialog.close();
      }
    }),
  );
  document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyC' && document.pointerLockElement && !event.repeat)
      toggleCamera();
    if (event.code === 'Tab' && document.pointerLockElement) {
      event.preventDefault();
      document.exitPointerLock();
      (
        document.getElementById('settings-dialog') as HTMLDialogElement
      ).showModal();
    }
  });
  document.addEventListener('click', (event) => {
    if ((event.target as HTMLElement)?.closest('button'))
      sharedAudioManager.playUiClick();
    if ((event.target as HTMLElement)?.closest('.track-toggle')) {
      sharedAudioManager.nextTrack();
      applySettings(settingsStore.get());
    }
  });
}
function toggleCamera() {
  settingsStore.update({
    cameraMode:
      settingsStore.get().cameraMode === 'follow' ? 'overhead' : 'follow',
  });
}

function bindSettings() {
  const bindings: Array<[string, keyof GameSettings]> = [
    ['music', 'music'],
    ['sfx', 'sfx'],
    ['volume', 'volume'],
    ['sensitivity', 'sensitivity'],
    ['fov', 'fov'],
    ['camera', 'cameraMode'],
    ['invert', 'invertY'],
    ['outlines', 'outlines'],
    ['motion', 'reducedMotion'],
  ];
  document
    .getElementById('settings-form')!
    .addEventListener('submit', (event) => event.preventDefault());
  bindings.forEach(([id, key]) => {
    const input = document.getElementById(`setting-${id}`) as
      | HTMLInputElement
      | HTMLSelectElement;
    input.addEventListener('input', () => {
      const value =
        input instanceof HTMLInputElement && input.type === 'checkbox'
          ? input.checked
          : input.type === 'range'
            ? Number(input.value)
            : input.value;
      settingsStore.update({ [key]: value });
    });
  });
  document
    .getElementById('settings-reset')!
    .addEventListener('click', () => settingsStore.reset());
}
function applySettings(settings: GameSettings) {
  const check = (id: string, value: boolean) => {
    (document.getElementById(id) as HTMLInputElement).checked = value;
  };
  check('setting-music', settings.music);
  check('setting-sfx', settings.sfx);
  check('setting-invert', settings.invertY);
  check('setting-outlines', settings.outlines);
  check('setting-motion', settings.reducedMotion);
  (document.getElementById('setting-volume') as HTMLInputElement).value =
    String(settings.volume);
  (document.getElementById('setting-sensitivity') as HTMLInputElement).value =
    String(settings.sensitivity);
  (document.getElementById('setting-fov') as HTMLInputElement).value = String(
    settings.fov,
  );
  (document.getElementById('setting-camera') as HTMLSelectElement).value =
    settings.cameraMode;
  setText('volume-value', `${settings.volume}%`);
  setText('sensitivity-value', `${settings.sensitivity.toFixed(1)}×`);
  setText('fov-value', `${settings.fov}°`);
  setText(
    'camera-mode-btn',
    `Cam: ${settings.cameraMode === 'follow' ? 'Bám theo' : 'Từ trên'}`,
  );
  document.documentElement.dataset.reducedMotion = String(
    settings.reducedMotion,
  );
  sharedAudioManager.setMasterVolume(settings.volume / 100);
  if (sharedAudioManager.isSfxEnabled() !== settings.sfx)
    sharedAudioManager.toggleSfx();
  if (!settings.music) sharedAudioManager.stopMusic();
  else if (starting) sharedAudioManager.startMusic();
  document.querySelectorAll('.track-toggle').forEach((button) => {
    button.textContent = `Đổi nhạc · ${sharedAudioManager.getCurrentTrack().title}`;
  });
}

async function startGame(options: {
  startDay: number;
  pendingReport?: DayReport;
}) {
  if (starting) return;
  starting = true;
  document.getElementById('start-screen')!.classList.remove('active');
  document.getElementById('loading-screen')!.classList.add('active');
  try {
    const [{ Engine }, { assetManager }, { obstacleModels }] =
      await Promise.all([
        import('./core/Engine'),
        import('./core/AssetManager'),
        import('./utils/modelList'),
      ]);
    const models: Array<[string, string]> = [
      ['home', '/models/home.glb'],
      ['robot', '/models/Robot.glb'],
      ['husky', '/models/Husky.glb'],
      ['Rat', '/models/Rat.glb'],
      ...obstacleModels.map(
        (name) => [name, `/models/${name}.glb`] as [string, string],
      ),
    ];
    let loaded = 0;
    await Promise.all(
      models.map(async ([name, path]) => {
        await assetManager.loadModel(name, path);
        loaded++;
        setText(
          'loading-text',
          `Đã chuẩn bị ${loaded} / ${models.length} mô hình`,
        );
        document.getElementById('loading-progress')!.style.width =
          `${(loaded / models.length) * 100}%`;
      }),
    );
    for (const name of ['home', 'robot', 'husky', 'Rat']) {
      if (!assetManager.getModel(name))
        throw new Error(`Missing required model: ${name}`);
    }
    document.getElementById('loading-screen')!.classList.remove('active');
    document.getElementById('game-ui')!.classList.add('active');
    engine = new Engine({
      ...options,
      startBattery: 100,
      audioManager: sharedAudioManager,
    });
    applySettings(settingsStore.get());
  } catch (error) {
    console.error('Could not open the house:', error);
    setText(
      'loading-text',
      'Chưa mở được căn nhà. Kiểm tra kết nối rồi thử lại.',
    );
    const retry = document.getElementById('loading-retry') as HTMLButtonElement;
    retry.hidden = false;
    retry.onclick = () => window.location.reload();
  }
}
