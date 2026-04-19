export interface SaveData {
  battery: number;
  cleanedCount: number;
  day: number;
  money: number;
}

const STORAGE_KEY = 'robot-vacuum-save';

export class SaveManager {
  public static load(): SaveData | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return {
        battery: Number(parsed.battery) || 100,
        cleanedCount: Number(parsed.cleanedCount) || 0,
        day: Number(parsed.day) || 1,
        money: Number(parsed.money) || 0,
      };
    } catch {
      return null;
    }
  }

  public static save(data: SaveData) {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  public static clear() {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }
}
