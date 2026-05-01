
import { Engine } from './core/Engine';
import { assetManager } from './core/AssetManager';
import { obstacleModels } from './utils/modelList';
import { SaveManager } from './systems/SaveManager';

const startScreen = document.getElementById('start-screen')!;
const loadingScreen = document.getElementById('loading-screen')!;
const gameUI = document.getElementById('game-ui')!;
const continueBtn = document.getElementById('continue-btn') as HTMLButtonElement | null;
const continueMeta = document.getElementById('continue-meta');
const newRunBtn = document.getElementById('new-run-btn') as HTMLButtonElement | null;
const replaySelect = document.getElementById('replay-day') as HTMLSelectElement | null;
const replayBtn = document.getElementById('replay-btn') as HTMLButtonElement | null;
const loadingText = document.getElementById('loading-text')!;
let engine: Engine | null = null;

hydrateHub();

function hydrateHub() {
  const save = SaveManager.load();
  if (continueBtn && continueMeta) {
    if (save) {
      continueBtn.disabled = false;
      continueMeta.textContent = `DAY ${save.day} (HIGHEST: DAY ${save.highestDay})`;
    } else {
      continueBtn.disabled = true;
      continueMeta.textContent = 'NO SAVE FOUND';
    }
  }

  if (replaySelect && replayBtn) {
    replaySelect.innerHTML = '';
    if (save) {
      const maxDay = Math.max(1, save.highestDay);
      for (let d = 1; d <= maxDay; d++) {
        const opt = document.createElement('option');
        opt.value = String(d);
        opt.textContent = `DAY ${d}`;
        replaySelect.appendChild(opt);
      }
      replaySelect.disabled = false;
      replayBtn.disabled = false;
    } else {
      replaySelect.disabled = true;
      replayBtn.disabled = true;
    }
  }

  continueBtn?.addEventListener('click', () => {
    const s = SaveManager.load();
    if (!s) return;
    startGame({ startDay: s.day, startBattery: s.battery });
  });

  newRunBtn?.addEventListener('click', () => {
    SaveManager.clear();
    startGame({ startDay: 1, startBattery: 100 });
  });

  replayBtn?.addEventListener('click', () => {
    const s = SaveManager.load();
    if (!s || !replaySelect) return;
    const day = Math.max(1, Math.min(s.highestDay, Number(replaySelect.value) || 1));
    startGame({ startDay: day, startBattery: 100 });
  });
}

function startGame(options: { startDay: number; startBattery: number }) {
  startScreen.classList.remove('active');
  loadingScreen.classList.add('active');
  loadGameAssets(options);
}

async function loadGameAssets(options: { startDay: number; startBattery: number }) {
  try {
    const promises = [
      assetManager.loadModel('home', '/models/home.glb'),
      assetManager.loadModel('robot', '/models/Robot.glb'),
      assetManager.loadModel('husky', '/models/Husky.glb'),
      assetManager.loadModel('Rat', '/models/Rat.glb')
    ];
    
    for (const name of obstacleModels) {
      promises.push(assetManager.loadModel(name, `/models/${name}.glb`));
    }
    
    // Artificial delay to show off the cool loading screen (optional)
    await Promise.all([...promises, new Promise(resolve => setTimeout(resolve, 800))]);

    const homeModel = assetManager.getModel('home');
    if (!homeModel) console.error('Failed to load home model');
    const robotModel = assetManager.getModel('robot');
    if (!robotModel) console.error('Failed to load robot model');
    const huskyModel = assetManager.getModel('husky');
    if (!huskyModel) console.error('Failed to load husky model');
  } catch (error) {
    console.error('Failed to load assets:', error);
    loadingText.innerText = 'ERROR: INITIALIZATION FAILED';
    loadingText.style.color = 'var(--color-danger)';
    return; // Stop execution if assets fail
  }

  // Transition to game UI
  loadingScreen.classList.remove('active');
  gameUI.classList.add('active');

  // Start the game engine
  engine = new Engine({ startDay: options.startDay, startBattery: options.startBattery });

  // Pause screen buttons
  const resumeBtn = document.getElementById('resume-btn');
  resumeBtn?.addEventListener('click', () => document.body.requestPointerLock());
  const restartDayBtn = document.getElementById('restart-day-btn');
  restartDayBtn?.addEventListener('click', () => engine?.restartDay());
  const restartRunBtn = document.getElementById('restart-run-btn');
  restartRunBtn?.addEventListener('click', () => {
    SaveManager.clear();
    window.location.reload();
  });
}
