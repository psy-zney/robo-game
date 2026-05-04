import { BATTERY_DRAIN_FACTOR, MAX_BATTERY, MOVE_SPEED, STORAGE_CAPACITY } from '../utils/constants';
import { SaveManager } from './SaveManager';

export class GameState {
  public battery = MAX_BATTERY;
  public cleanedCells = 0;
  public totalCells = 0;
  public storage = 0;
  public storageCapacity = STORAGE_CAPACITY;
  public day = 1;
  public money = 0;

  public init(totalCells: number) {
    this.totalCells = totalCells;
    const saved = SaveManager.load();
    if (saved) {
      this.battery = saved.battery;
      this.cleanedCells = saved.cleanedCount;
      this.day = saved.day;
      this.money = saved.money;
    } else {
      this.battery = MAX_BATTERY;
      this.cleanedCells = 0;
      this.day = 1;
      this.money = 0;
    }
  }

  public saveState() {
    const existing = SaveManager.load();
    const highestDay = Math.max(existing?.highestDay ?? 1, this.day);
    SaveManager.save({
      battery: this.battery,
      cleanedCount: this.cleanedCells,
      day: this.day,
      money: this.money,
      highestDay,
      version: '1.0.0',
      timestamp: Date.now(),
      playtime: 0,
    });
  }

  public canMove(): boolean {
    return this.battery > 0;
  }

  public drainBattery(deltaTime: number, moving: boolean) {
    const speedFactor = moving ? MOVE_SPEED : MOVE_SPEED * 0.25;
    const drainAmount = deltaTime * 40 * BATTERY_DRAIN_FACTOR * speedFactor;
    this.battery = Math.max(0, this.battery - drainAmount);
  }

  public rechargeBattery(deltaTime: number, rate: number) {
    this.battery = Math.min(MAX_BATTERY, this.battery + deltaTime * rate);
  }

  public collectItem() {
    if (this.storage < this.storageCapacity) {
      this.storage += 1;
    }
  }

  public emptyStorage() {
    this.storage = 0;
  }

  public isStorageFull() {
    return this.storage >= this.storageCapacity;
  }

  public incrementCleaned() {
    this.cleanedCells = Math.min(this.totalCells, this.cleanedCells + 1);
    this.saveState();
  }

  public setDay(day: number) {
    this.day = day;
    this.saveState();
  }

  public addMoney(amount: number) {
    this.money += amount;
    this.saveState();
  }

  public updateCleaned(cleanedCount: number) {
    this.cleanedCells = cleanedCount;
  }
}
