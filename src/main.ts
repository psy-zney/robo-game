
import { Engine } from './core/Engine';
import { assetManager } from './core/AssetManager';
import { obstacleModels } from './utils/modelList';

const startScreen = document.getElementById('start-screen')!;
const loadingScreen = document.getElementById('loading-screen')!;
const gameUI = document.getElementById('game-ui')!;
const startBtn = document.getElementById('start-btn')!;
const loadingText = document.getElementById('loading-text')!;

// Initial state: start screen is active, others are hidden by CSS opacity 0 / pointer-events none
startBtn.addEventListener('click', () => {
  startScreen.classList.remove('active');
  loadingScreen.classList.add('active');
  loadGameAssets();
});

async function loadGameAssets() {
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
  new Engine();
}
