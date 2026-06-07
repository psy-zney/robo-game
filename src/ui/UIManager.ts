export class UIManager {
  private batteryElement: HTMLElement | null;
  private batteryBar: HTMLElement | null;
  private progressElement: HTMLElement | null;
  private storageElement: HTMLElement | null;
  private storageBar: HTMLElement | null;
  private statusElement: HTMLElement | null;
  private dayElement: HTMLElement | null;
  private levelTitleElement: HTMLElement | null;
  private missionElement: HTMLElement | null;
  private actionElement: HTMLElement | null;
  private difficultyElement: HTMLElement | null;
  private cameraSettingsElement: HTMLElement | null;

  // State tracking for efficient updates
  private lastBattery = 100;
  private lastStorage = 0;
  private lastDay = 1;
  private lastLevelTitle = '';
  private lastCleaned = 0;
  private lastTotal = 0;
  private lastStatus = '';
  private lastMission = '';
  private lastDifficulty = 1.0;
  private lastCameraSettings = '';

  constructor() {
    this.batteryElement = document.getElementById('battery');
    this.batteryBar = document.getElementById('battery-bar');
    this.progressElement = document.getElementById('progress');
    this.storageElement = document.getElementById('storage');
    this.storageBar = document.getElementById('storage-bar');
    this.statusElement = document.getElementById('status');
    this.dayElement = document.getElementById('day-counter');
    this.levelTitleElement = document.getElementById('level-title');
    this.missionElement = document.getElementById('mission');
    this.actionElement = document.getElementById('action');
    this.difficultyElement = document.getElementById('difficulty');
    this.cameraSettingsElement = document.getElementById('camera-settings');

    this.setupMenuNavigation();
    this.setupAnimations();
  }

  private setupMenuNavigation() {
    document.addEventListener('keydown', (e) => {
      // Only navigate if pointer lock is OFF (not in-game)
      if (!document.pointerLockElement) {
        const activeScreen = document.querySelector('.screen.active');
        if (!activeScreen) return;

        // IMPORTANT: Do NOT intercept keys on the pause screen
        // The pause screen just shows "click to resume" — no buttons to navigate
        const screenId = (activeScreen as HTMLElement).id;
        if (screenId === 'pause-screen' || screenId === 'game-ui') return;

        const buttons = Array.from(activeScreen.querySelectorAll('button')) as HTMLElement[];
        if (buttons.length === 0) return;

        let currentIndex = buttons.findIndex(b => b === document.activeElement);

        if (e.code === 'Enter' || e.code === 'Space') {
          if (currentIndex === -1) {
            buttons[0].click();
          } else {
            buttons[currentIndex].click();
          }
          return;
        }

        if (e.code === 'KeyW' || e.code === 'KeyA') {
          currentIndex = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
          buttons[currentIndex].focus();
        } else if (e.code === 'KeyS' || e.code === 'KeyD') {
          currentIndex = currentIndex === -1 || currentIndex >= buttons.length - 1 ? 0 : currentIndex + 1;
          buttons[currentIndex].focus();
        }
      }
    });
  }

  private setupAnimations() {
    // Add CSS animations for notifications and feedback
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }
      .notification {
        animation: slideDown 0.3s ease-out;
      }
      .pulse {
        animation: pulse 0.3s ease-out;
      }
      .shake {
        animation: shake 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
  }

  public update(
    battery: number, cleaned: number, total: number,
    storage: number, capacity: number, status: string, day: number, mission?: string, difficulty?: number, cameraSettings?: string, levelTitle?: string
  ) {
    // Only update DOM if values changed significantly for performance
    const batteryChanged = Math.abs(battery - this.lastBattery) > 0.5;
    const storageChanged = storage !== this.lastStorage;
    const dayChanged = day !== this.lastDay;
    const progressChanged = cleaned !== this.lastCleaned || total !== this.lastTotal;
    const statusChanged = status !== this.lastStatus;
    const missionChanged = (mission ?? '') !== this.lastMission;
    const levelTitleChanged = (levelTitle ?? '') !== this.lastLevelTitle;
    const difficultyChanged = difficulty !== undefined && Math.abs(difficulty - this.lastDifficulty) > 0.01;
    const cameraSettingsChanged = cameraSettings !== undefined && cameraSettings !== this.lastCameraSettings;

    if (batteryChanged) {
      this.updateBattery(battery);
      this.lastBattery = battery;
    }

    if (storageChanged) {
      this.updateStorage(storage, capacity);
      this.lastStorage = storage;
    }

    if (dayChanged) {
      this.updateDay(day);
      this.lastDay = day;
    }

    if (progressChanged) {
      this.updateProgress(cleaned, total);
      this.lastCleaned = cleaned;
      this.lastTotal = total;
    }

    if (statusChanged) {
      this.updateStatus(status);
      this.lastStatus = status;
    }

    if (missionChanged) {
      this.updateMission(mission);
      this.lastMission = mission ?? '';
    }

    if (levelTitleChanged) {
      this.updateLevelTitle(levelTitle);
      this.lastLevelTitle = levelTitle ?? '';
    }

    if (difficultyChanged && difficulty !== undefined) {
      this.updateDifficulty(difficulty);
      this.lastDifficulty = difficulty;
    }

    if (cameraSettingsChanged && cameraSettings !== undefined) {
      this.updateCameraSettings(cameraSettings);
      this.lastCameraSettings = cameraSettings;
    }
  }

  private updateBattery(battery: number) {
    if (this.batteryElement && this.batteryBar) {
      const batVal = Math.round(battery);
      this.batteryElement.textContent = `${batVal}%`;
      this.batteryBar.style.width = `${batVal}%`;

      if (batVal < 20) {
        this.batteryBar.className = 'rpg-bar-fill bg-danger';
        this.batteryElement.style.color = 'var(--color-danger)';
      } else {
        this.batteryBar.className = 'rpg-bar-fill energy-fill';
        this.batteryElement.style.color = '';
      }
    }
  }

  private updateStorage(storage: number, capacity: number) {
    if (this.storageElement && this.storageBar) {
      this.storageElement.textContent = `${storage} / ${capacity}`;
      const storagePercent = capacity > 0 ? (storage / capacity) * 100 : 0;
      this.storageBar.style.width = `${storagePercent}%`;

      if (storagePercent >= 100) {
        this.storageBar.className = 'stat-fill bg-danger';
        this.storageElement.style.color = 'var(--color-danger)';
      } else {
        this.storageBar.className = 'stat-fill storage-fill';
        this.storageElement.style.color = '';
      }
    }
  }

  private updateDay(day: number) {
    if (this.dayElement) {
      this.dayElement.textContent = `DAY ${day}`;
      // Add pulse animation for day change
      this.dayElement.classList.add('pulse');
      setTimeout(() => this.dayElement?.classList.remove('pulse'), 300);
    }
  }

  private updateProgress(cleaned: number, total: number) {
    if (this.progressElement) {
      this.progressElement.textContent = `${Math.max(0, total - cleaned)} / ${total}`;
    }
  }

  private updateStatus(status: string) {
    if (this.statusElement) {
      this.statusElement.textContent = status.toUpperCase();
      // Error states
      if (status.toLowerCase().includes('hit') || status.toLowerCase().includes('out') || status.toLowerCase().includes('failed')) {
        this.statusElement.style.color = 'var(--color-danger)';
        this.statusElement.style.textShadow = '0 0 10px var(--color-danger-glow)';
      } else if (status.toLowerCase().includes('charg')) {
        this.statusElement.style.color = 'var(--color-success)';
        this.statusElement.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.5)';
      } else {
        this.statusElement.style.color = 'var(--color-accent)';
        this.statusElement.style.textShadow = '0 0 10px var(--color-accent-glow)';
      }
    }
  }

  private updateMission(mission: string | undefined) {
    if (this.missionElement) {
      this.missionElement.textContent = (mission ?? '').toUpperCase();
    }
  }

  private updateLevelTitle(levelTitle: string | undefined) {
    if (this.levelTitleElement) {
      this.levelTitleElement.textContent = (levelTitle ?? 'Calibration').toUpperCase();
    }
  }

  private updateDifficulty(difficulty: number) {
    if (this.difficultyElement) {
      this.difficultyElement.textContent = `${difficulty.toFixed(1)}x`;

      // Color code based on difficulty
      if (difficulty < 1.0) {
        this.difficultyElement.style.color = 'var(--success)';
      } else if (difficulty < 1.5) {
        this.difficultyElement.style.color = 'var(--accent)';
      } else if (difficulty < 2.0) {
        this.difficultyElement.style.color = '#ffaa00';
      } else {
        this.difficultyElement.style.color = 'var(--danger)';
      }
    }
  }

  private updateCameraSettings(settings: string) {
    if (this.cameraSettingsElement) {
      this.cameraSettingsElement.textContent = settings;
    }
  }

  // Visual feedback methods
  public flashScreen(color: string = 'rgba(255, 0, 0, 0.3)', duration: number = 200) {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      inset: 0;
      background: ${color};
      pointer-events: none;
      z-index: 1000;
      opacity: 1;
      transition: opacity ${duration}ms ease-out;
    `;
    document.body.appendChild(flash);

    requestAnimationFrame(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), duration);
    });
  }

  public showNotification(message: string, type: 'success' | 'warning' | 'danger' = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    const colors = {
      success: 'var(--color-success)',
      warning: 'var(--color-accent)',
      danger: 'var(--color-danger)'
    };

    notification.style.cssText = `
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      background: var(--panel);
      border: 1px solid ${colors[type]};
      color: var(--text);
      font-weight: 600;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  public updateActionPrompt(sweepActive: boolean, mopActive: boolean) {
    if (this.actionElement) {
      if (sweepActive) {
        this.actionElement.innerHTML = '<span>[ E ]</span> SWEEPING...';
      } else if (mopActive) {
        this.actionElement.innerHTML = '<span>[ R ]</span> MOPPING...';
      } else {
        this.actionElement.innerHTML = '<span>[ E ]</span> SWEEP &nbsp;&nbsp; <span>[ R ]</span> MOP';
      }
    }
  }

  public shakeElement(elementId: string) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('shake');
      setTimeout(() => element.classList.remove('shake'), 300);
    }
  }
}
