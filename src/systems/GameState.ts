import { BATTERY_DRAIN_MOVE, MAX_BATTERY, STORAGE_CAPACITY } from '../utils/constants';
import { SaveManager } from './SaveManager';

/**
 * GameState - Manages all game state including battery, cleaning progress, and save data
 * GameState - Quản lý tất cả trạng thái game bao gồm pin, tiến trình làm sạch và dữ liệu lưu
 */
export class GameState {
  public battery = MAX_BATTERY;
  public cleanedCells = 0;
  public totalCells = 0;
  public storage = 0;
  public storageCapacity = STORAGE_CAPACITY;
  public day = 1;
  public money = 0;

  /**
   * Initialize game state from saved data or defaults
   * Khởi tạo trạng thái game từ dữ liệu đã lưu hoặc mặc định
   * @param totalCells - Total number of cells in the grid
   */
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

  /**
   * Save current game state to localStorage
   * Lưu trạng thái game hiện tại vào localStorage
   */
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
      completedDays: existing?.completedDays,
      pendingReport: existing?.pendingReport,
    });
  }

  /**
   * Check if robot can move (has battery)
   * Kiểm tra xem robot có thể di chuyển không (có pin)
   * @returns True if robot can move
   */
  public canMove(): boolean {
    return this.battery > 0;
  }

  /**
   * Drain battery based on movement and actions
   * Tiêu thụ pin dựa trên di chuyển và hành động
   * @param deltaTime - Time since last frame in seconds
   * @param moving - Whether robot is currently moving
   */
  public drainBattery(deltaTime: number, moving: boolean) {
    if (moving) this.battery = Math.max(0, this.battery - deltaTime * BATTERY_DRAIN_MOVE);
  }

  /**
   * Recharge battery at specified rate
   * Sạc pin với tốc độ được chỉ định
   * @param deltaTime - Time since last frame in seconds
   * @param rate - Recharge rate per second
   */
  public rechargeBattery(deltaTime: number, rate: number) {
    this.battery = Math.min(MAX_BATTERY, this.battery + deltaTime * rate);
  }

  /**
   * Collect an item into storage
   * Thu thập vật phẩm vào lưu trữ
   */
  public collectItem() {
    if (this.storage < this.storageCapacity) {
      this.storage += 1;
    }
  }

  /**
   * Empty all storage
   * Làm trống tất cả lưu trữ
   */
  public emptyStorage() {
    this.storage = 0;
  }

  /**
   * Check if storage is full
   * Kiểm tra xem lưu trữ có đầy không
   * @returns True if storage is at capacity
   */
  public isStorageFull() {
    return this.storage >= this.storageCapacity;
  }

  /**
   * Increment cleaned cells count and save
   * Tăng số ô đã làm sạch và lưu
   */
  public incrementCleaned() {
    this.cleanedCells = Math.min(this.totalCells, this.cleanedCells + 1);
    this.saveState();
  }

  /**
   * Set current day and save
   * Đặt ngày hiện tại và lưu
   * @param day - Day number to set
   */
  public setDay(day: number) {
    this.day = day;
    this.saveState();
  }

  /**
   * Add money and save
   * Thêm tiền và lưu
   * @param amount - Amount of money to add
   */
  public addMoney(amount: number) {
    this.money += amount;
    this.saveState();
  }

  /**
   * Update cleaned cells count
   * Cập nhật số ô đã làm sạch
   * @param cleanedCount - New cleaned cells count
   */
  public updateCleaned(cleanedCount: number) {
    this.cleanedCells = cleanedCount;
  }
}
