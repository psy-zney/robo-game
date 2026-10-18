import type { DayReport } from './StorySystem';

export interface SaveData {
  battery: number;
  cleanedCount: number;
  day: number;
  money: number;
  highestDay: number;
  version: string; // Save format version
  timestamp: number; // When the save was created
  playtime: number; // Total playtime in seconds
  completedDays?: number[];
  pendingReport?: DayReport;
  dayStats?: Record<number, { stars: number; score: number; maxCombo: number; elapsedTime?: number }>;
}

export interface SaveMetadata {
  exists: boolean;
  day: number;
  highestDay: number;
  battery: number;
  timestamp: number;
  playtime: number;
  version: string;
}

const STORAGE_KEY = 'robot-vacuum-save';
const BACKUP_KEY = 'robot-vacuum-backup';
const CURRENT_VERSION = '1.0.0';

export class SaveManager {
  private static currentPlaytime = 0;
  private static sessionStartTime = Date.now();

  public static load(): SaveData | null {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return null;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      console.log('No save data found');
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SaveData>;

      // Validate and sanitize data
      const day = this.validateNumber(parsed.day, 1, 1, 1000);
      const highestDay = this.validateNumber(parsed.highestDay, day, 1, 1000);
      const battery = this.validateNumber(parsed.battery, 100, 0, 100);
      const cleanedCount = this.validateNumber(parsed.cleanedCount, 0, 0, 100000);
      const money = this.validateNumber(parsed.money, 0, 0, 1000000);
      const version = parsed.version || '0.0.0';
      const timestamp = this.validateNumber(parsed.timestamp, Date.now(), 0, Date.now() + 31536000000); // Within 1 year
      const playtime = this.validateNumber(parsed.playtime, 0, 0, 31536000); // Max 1 year

      const saveData: SaveData = {
        battery,
        cleanedCount,
        day,
        money,
        highestDay,
        version,
        timestamp,
        playtime,
        completedDays: this.validateCompletedDays(parsed.completedDays, highestDay),
        pendingReport: this.validateReport(parsed.pendingReport, day),
        dayStats: this.validateDayStats(parsed.dayStats),
      };

      console.log(`✅ Loaded save: Day ${day}, Battery ${battery}%, Version ${version}`);
      return saveData;
    } catch (error) {
      console.error('Failed to parse save data:', error);

      // Try to load backup
      const backup = this.loadBackup();
      if (backup) {
        console.log('🔄 Loaded from backup');
        return backup;
      }

      return null;
    }
  }

  public static save(data: SaveData) {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return;
    }

    try {
      // Update playtime
      this.currentPlaytime += (Date.now() - this.sessionStartTime) / 1000;
      this.sessionStartTime = Date.now();

      const saveData: SaveData = {
        ...data,
        version: CURRENT_VERSION,
        timestamp: Date.now(),
        playtime: this.currentPlaytime,
      };

      // Validate before saving
      const validated = this.validateSaveData(saveData);

      // Create backup before saving
      this.createBackup();

      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
      console.log(`💾 Saved game: Day ${validated.day}, Battery ${validated.battery}%`);
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }

  public static clear() {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return;
    }

    try {
      // Create backup before clearing
      this.createBackup();

      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Save data cleared');

      // Reset playtime
      this.currentPlaytime = 0;
      this.sessionStartTime = Date.now();
    } catch (error) {
      console.error('Failed to clear save data:', error);
    }
  }

  public static getMetadata(): SaveMetadata {
    const saveData = this.load();
    if (!saveData) {
      return {
        exists: false,
        day: 1,
        highestDay: 1,
        battery: 100,
        timestamp: 0,
        playtime: 0,
        version: CURRENT_VERSION,
      };
    }

    return {
      exists: true,
      day: saveData.day,
      highestDay: saveData.highestDay,
      battery: saveData.battery,
      timestamp: saveData.timestamp,
      playtime: saveData.playtime,
      version: saveData.version,
    };
  }

  public static exportSave(): string {
    const saveData = this.load();
    if (!saveData) {
      throw new Error('No save data to export');
    }

    return btoa(JSON.stringify(saveData));
  }

  public static importSave(saveString: string): boolean {
    try {
      const decoded = atob(saveString);
      const parsed = JSON.parse(decoded) as SaveData;

      // Validate imported data
      const validated = this.validateSaveData(parsed);

      // Create backup before importing
      this.createBackup();

      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
      console.log('📥 Save data imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import save data:', error);
      return false;
    }
  }

  public static hasSave(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  public static getPlaytime(): number {
    return this.currentPlaytime;
  }

  public static getPlaytimeFormatted(): string {
    const totalSeconds = Math.floor(this.currentPlaytime);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private static validateNumber(
    value: unknown,
    defaultValue: number,
    min: number,
    max: number
  ): number {
    const num = Number(value);
    if (isNaN(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
  }

  private static validateSaveData(data: Partial<SaveData>): SaveData {
    return {
      battery: this.validateNumber(data.battery, 100, 0, 100),
      cleanedCount: this.validateNumber(data.cleanedCount, 0, 0, 100000),
      day: this.validateNumber(data.day, 1, 1, 1000),
      money: this.validateNumber(data.money, 0, 0, 1000000),
      highestDay: this.validateNumber(data.highestDay, data.day || 1, 1, 1000),
      version: data.version || CURRENT_VERSION,
      timestamp: this.validateNumber(data.timestamp, Date.now(), 0, Date.now() + 31536000000),
      playtime: this.validateNumber(data.playtime, 0, 0, 31536000),
      completedDays: this.validateCompletedDays(data.completedDays, data.highestDay ?? 1),
      pendingReport: this.validateReport(data.pendingReport, data.day ?? 1),
      dayStats: this.validateDayStats(data.dayStats),
    };
  }

  public static recordDayStats(
    day: number,
    stats: { stars: number; score: number; maxCombo: number; elapsedTime?: number },
  ) {
    const current = this.load();
    if (!current) return;
    const dayStats = { ...(current.dayStats ?? {}) };
    const prev = dayStats[day];
    if (
      !prev ||
      stats.stars > prev.stars ||
      (stats.stars === prev.stars && stats.score > prev.score)
    ) {
      dayStats[day] = stats;
    }
    this.save({
      ...current,
      dayStats,
    });
  }

  private static validateDayStats(
    stats: unknown,
  ): Record<number, { stars: number; score: number; maxCombo: number; elapsedTime?: number }> | undefined {
    if (!stats || typeof stats !== 'object') return undefined;
    const result: Record<number, { stars: number; score: number; maxCombo: number; elapsedTime?: number }> = {};
    for (const [key, val] of Object.entries(stats as Record<string, unknown>)) {
      const dayNum = Number(key);
      if (!Number.isNaN(dayNum) && dayNum >= 1 && dayNum <= 1000 && val && typeof val === 'object') {
        const v = val as { stars?: unknown; score?: unknown; maxCombo?: unknown; elapsedTime?: unknown };
        result[dayNum] = {
          stars: this.validateNumber(v.stars, 0, 0, 3),
          score: this.validateNumber(v.score, 0, 0, 10000000),
          maxCombo: this.validateNumber(v.maxCombo, 1, 1, 100),
          elapsedTime: typeof v.elapsedTime === 'number' ? v.elapsedTime : undefined,
        };
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  private static validateCompletedDays(days: unknown, highestDay: number): number[] {
    // Migrate older checkpoints: only days before the furthest checkpoint were finished.
    if (!Array.isArray(days)) return Array.from({ length: Math.max(0, Math.min(999, Math.floor(highestDay) - 1)) }, (_, i) => i + 1);
    return [...new Set(days.filter((day): day is number => typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 1000))].sort((a, b) => a - b);
  }

  private static validateReport(report: unknown, day: number): DayReport | undefined {
    if (!report || typeof report !== 'object') return undefined;
    const value = report as Partial<DayReport>;
    if (value.day !== day) return undefined;
    return { day, stains: this.validateNumber(value.stains, 0, 0, 100000), dust: this.validateNumber(value.dust, 0, 0, 100000), battery: this.validateNumber(value.battery, 100, 0, 100) };
  }

  private static createBackup() {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const currentSave = localStorage.getItem(STORAGE_KEY);
    if (currentSave) {
      try {
        localStorage.setItem(BACKUP_KEY, currentSave);
        console.log('💾 Backup created');
      } catch (error) {
        console.error('Failed to create backup:', error);
      }
    }
  }

  private static loadBackup(): SaveData | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const backup = localStorage.getItem(BACKUP_KEY);
    if (!backup) {
      return null;
    }

    try {
      const parsed = JSON.parse(backup) as Partial<SaveData>;
      return this.validateSaveData(parsed);
    } catch (error) {
      console.error('Failed to load backup:', error);
      return null;
    }
  }

  public static restoreBackup(): boolean {
    const backup = this.loadBackup();
    if (!backup) {
      console.warn('No backup available');
      return false;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup));
      console.log('🔄 Backup restored successfully');
      return true;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return false;
    }
  }
}
