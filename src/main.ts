import { Engine } from './core/Engine';
import { assetManager } from './core/AssetManager';
import { obstacleModels } from './utils/modelList';

async function bootstrap() {
  // Create a simple loading UI
  const loadingElement = document.createElement('div');
  loadingElement.style.position = 'absolute';
  loadingElement.style.top = '0';
  loadingElement.style.left = '0';
  loadingElement.style.width = '100%';
  loadingElement.style.height = '100%';
  loadingElement.style.backgroundColor = '#111';
  loadingElement.style.color = '#fff';
  loadingElement.style.display = 'flex';
  loadingElement.style.flexDirection = 'column';
  loadingElement.style.justifyContent = 'center';
  loadingElement.style.alignItems = 'center';
  loadingElement.style.fontFamily = 'sans-serif';
  loadingElement.style.zIndex = '9999';
  
  const spinner = document.createElement('div');
  spinner.style.border = '4px solid rgba(255, 255, 255, 0.3)';
  spinner.style.borderTop = '4px solid #fff';
  spinner.style.borderRadius = '50%';
  spinner.style.width = '40px';
  spinner.style.height = '40px';
  spinner.animate([
    { transform: 'rotate(0deg)' },
    { transform: 'rotate(360deg)' }
  ], { duration: 1000, iterations: Infinity });
  
  const text = document.createElement('h2');
  text.innerText = 'Loading 3D Models...';
  text.style.marginTop = '20px';

  loadingElement.appendChild(spinner);
  loadingElement.appendChild(text);
  document.body.appendChild(loadingElement);

  try {
    const promises = [
      assetManager.loadModel('house', '/models/House interior.glb'),
      assetManager.loadModel('roomba', '/models/Roomba.glb'),
      assetManager.loadModel('door', '/models/Door.glb'),
      assetManager.loadModel('husky', '/models/Husky.glb')
    ];
    for (const name of obstacleModels) {
      promises.push(assetManager.loadModel(name, `/models/${name}.glb`));
    }
    await Promise.all(promises);
  } catch (error) {
    console.error('Failed to load assets:', error);
    text.innerText = 'Failed to load models. Check console.';
    return; // Stop execution if assets fail
  }

  // Remove loading UI
  document.body.removeChild(loadingElement);

  // Start the game
  new Engine();
}

bootstrap();
