export interface GameSettings {
  music: boolean;
  sfx: boolean;
  volume: number;
  sensitivity: number;
  fov: number;
  cameraMode: 'follow' | 'overhead';
  invertY: boolean;
  outlines: boolean;
  reducedMotion: boolean;
}
const key = 'roboclean-settings-v1';
export function defaultSettings(): GameSettings {
  return {
    music: true,
    sfx: true,
    volume: 80,
    sensitivity: 1,
    fov: 70,
    cameraMode: 'follow',
    invertY: false,
    outlines: true,
    reducedMotion:
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}
export function sanitizeSettings(raw: Partial<GameSettings>): GameSettings {
  const defaults = defaultSettings();
  const numeric = (
    value: unknown,
    fallback: number,
    min: number,
    max: number,
  ) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(min, Math.min(max, value))
      : fallback;
  const flag = (value: unknown, fallback: boolean) =>
    typeof value === 'boolean' ? value : fallback;
  return {
    music: flag(raw.music, defaults.music),
    sfx: flag(raw.sfx, defaults.sfx),
    volume: numeric(raw.volume, 80, 0, 100),
    sensitivity: numeric(raw.sensitivity, 1, 0.4, 2),
    fov: numeric(raw.fov, 70, 58, 84),
    cameraMode: raw.cameraMode === 'overhead' ? 'overhead' : 'follow',
    invertY: flag(raw.invertY, false),
    outlines: flag(raw.outlines, true),
    reducedMotion: flag(raw.reducedMotion, defaults.reducedMotion),
  };
}
class SettingsStore {
  private values = defaultSettings();
  private listeners = new Set<(settings: GameSettings) => void>();
  constructor() {
    try {
      const raw = localStorage.getItem(key);
      if (raw) this.values = sanitizeSettings(JSON.parse(raw) ?? {});
    } catch {
      /* Storage may be blocked. In-memory controls still work. */
    }
  }
  get(): GameSettings {
    return { ...this.values };
  }
  update(patch: Partial<GameSettings>) {
    this.values = sanitizeSettings({ ...this.values, ...patch });
    try {
      localStorage.setItem(key, JSON.stringify(this.values));
    } catch {
      /* Continue with the session settings. */
    }
    this.listeners.forEach((listener) => listener(this.get()));
  }
  subscribe(listener: (settings: GameSettings) => void) {
    this.listeners.add(listener);
    listener(this.get());
    return () => this.listeners.delete(listener);
  }
  reset() {
    this.update(defaultSettings());
  }
}
export const settingsStore = new SettingsStore();
