import { setText } from './StoryView';

export class UIManager {
  private notificationTimer = 0;
  public update(
    battery: number,
    cleaned: number,
    total: number,
    storage: number,
    capacity: number,
    status: string,
    day: number,
    mission = '',
    difficulty = 1,
    cameraSettings = '',
    levelTitle = '',
  ) {
    setText('battery', `${Math.round(battery)}%`);
    const batteryBar = document.getElementById('battery-bar');
    if (batteryBar) {
      batteryBar.style.width = `${Math.max(0, battery)}%`;
      batteryBar.style.background =
        battery < 20 ? 'var(--danger)' : 'var(--success)';
    }
    document
      .getElementById('battery-meter')
      ?.setAttribute('aria-valuenow', String(Math.round(battery)));
    setText('storage', `${storage} / ${capacity}`);
    const storageBar = document.getElementById('storage-bar');
    if (storageBar)
      storageBar.style.width = `${Math.min(100, (storage / capacity) * 100)}%`;
    setText('progress', `${Math.max(0, total - cleaned)} / ${total}`);
    setText('status', translateStatus(status));
    setText('day-counter', `Ngày ${String(day).padStart(2, '0')}`);
    setText('level-title', levelTitle);
    setText('mission', mission);
    setText('difficulty', `${difficulty.toFixed(1)}×`);
    setText('camera-settings', cameraSettings);
  }
  public updateActionPrompt(sweep: boolean, mop: boolean, hint?: string) {
    setText(
      'action',
      hint ??
        (sweep
          ? 'Đang hút bụi…'
          : mop
            ? 'Đang lau sàn…'
            : 'Tiến lại gần · Giữ E hút / R lau'),
    );
  }
  public updateTargetProgress(progress: number) {
    const bar = document.getElementById('target-progress');
    if (bar) bar.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  }
  public updateObjectives(text: string) {
    setText('objectives', text);
  }
  public updateDockHint(distance: number, bearing: number) {
    const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    const arrow = arrows[((Math.round(bearing / (Math.PI / 4)) % 8) + 8) % 8];
    setText(
      'dock-hint',
      `Trạm ${arrow} ${distance.toFixed(1)} m · Dừng, thả E/R để sạc & đổ bụi`,
    );
  }
  public showNotification(
    message: string,
    _type: 'success' | 'warning' | 'danger' = 'success',
  ) {
    setText('toast', message);
    document.getElementById('toast')?.classList.add('visible');
    window.clearTimeout(this.notificationTimer);
    this.notificationTimer = window.setTimeout(
      () => document.getElementById('toast')?.classList.remove('visible'),
      2600,
    );
  }
}
function translateStatus(status: string) {
  const dictionary: Record<string, string> = {
    Ready: 'Sẵn sàng',
    'Preparing room...': 'Đang chuẩn bị nhà…',
    'Sweeping...': 'Đang hút…',
    'Mopping...': 'Đang lau…',
    'Moving...': 'Đang di chuyển',
    'Out of battery.': 'Đã hết pin',
    'Recovering...': 'Đang lấy lại thăng bằng',
    'Husky in the way!': 'Bắp ở phía trước!',
    'Obstacle detected.': 'Có vật cản',
    'Storage full. Return to the green dock.': 'Hộp đầy · Về trạm đổ bụi',
    'Room clean. Return to the green dock.': 'Nhà sạch · Về trạm hoàn thành ca',
    'Low battery. Return to the green dock.': 'Pin yếu · Về trạm sạc',
    'Needs mop [R].': 'Vết ướt · Giữ R để lau',
    'Sweep [E] first.': 'Hút bằng E trước',
    'Dust collected.': 'Đã thu bụi',
    'Swept clean.': 'Đã hút sạch',
    'Mopped clean.': 'Đã lau sạch',
    'Sweeping stain...': 'Đang hút vết bám…',
    'Mopping stain...': 'Đang lau vết bám…',
  };
  if (status.startsWith('Charging...'))
    return status.replace('Charging...', 'Đang sạc');
  if (status.startsWith('Restarting Day'))
    return status.replace('Restarting Day', 'Đang dọn lại ngày');
  return dictionary[status] ?? status;
}
