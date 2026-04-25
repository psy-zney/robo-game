export class UIManager {
  private batteryElement: HTMLElement | null;
  private batteryBar: HTMLElement | null;
  private progressElement: HTMLElement | null;
  private storageElement: HTMLElement | null;
  private storageBar: HTMLElement | null;
  private statusElement: HTMLElement | null;
  private dayElement: HTMLElement | null;

  constructor() {
    this.batteryElement = document.getElementById('battery');
    this.batteryBar = document.getElementById('battery-bar');
    this.progressElement = document.getElementById('progress');
    this.storageElement = document.getElementById('storage');
    this.storageBar = document.getElementById('storage-bar');
    this.statusElement = document.getElementById('status');
    this.dayElement = document.getElementById('day-counter');

    this.setupMenuNavigation();
  }

  private setupMenuNavigation() {
    document.addEventListener('keydown', (e) => {
      // Only navigate if we are not actively playing (pointer lock off)
      if (!document.pointerLockElement) {
        const activeScreen = document.querySelector('.screen.active');
        if (!activeScreen) return;
        
        const buttons = Array.from(activeScreen.querySelectorAll('button')) as HTMLElement[];
        if (buttons.length === 0) return;
        
        let currentIndex = buttons.findIndex(b => b === document.activeElement);
        
        if (e.code === 'Enter' || e.code === 'Space') {
          if (currentIndex === -1) {
            buttons[0].click(); // Default click first button
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

  public update(
    battery: number, cleaned: number, total: number,
    storage: number, capacity: number, status: string, day: number
  ) {

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

    if (this.progressElement) {
      this.progressElement.textContent = `${cleaned} / ${total}`;
    }

    if (this.storageElement && this.storageBar) {
      this.storageElement.textContent = `${storage} / ${capacity}`;
      const storagePercent = capacity > 0 ? (storage / capacity) * 100 : 0;
      this.storageBar.style.width = `${storagePercent}%`;

      if (storagePercent >= 100) {
        this.storageBar.className = 'stat-fill bg-danger';
        this.storageElement.style.color = 'var(--color-danger)';
      } else {
        this.storageBar.className = 'stat-fill bg-purple';
        this.storageElement.style.color = '';
      }
    }

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

    if (this.dayElement) {
      this.dayElement.textContent = `DAY ${day}`;
    }
  }
}
