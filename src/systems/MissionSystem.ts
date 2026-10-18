import { COMBO_MAX, COMBO_TIMEOUT, STAR_THRESHOLDS } from '../utils/constants';

export type MissionPhase = 'loading' | 'cleaning' | 'returning' | 'complete';

/** Star rating earned at end of each day. */
export interface StarRating {
  /** 0-3 stars based on remaining battery. */
  batteryStars: number;
  /** 0-3 stars based on completion time. */
  timeStars: number;
  /** Combined 0-3 average (rounded). */
  total: number;
}

/**
 * Mission system with combo multiplier, star rating, and enhanced objectives.
 *
 * Objectives derive from what actually spawned, so small rooms remain finishable.
 */
export class MissionSystem {
  public phase: MissionPhase = 'loading';
  public spots = 0;
  public dust = 0;
  public cleanedSpots = 0;
  public collectedDust = 0;

  // Combo system
  public combo = 0;
  public comboTimer = 0;
  public maxCombo = 0;

  // Scoring
  public score = 0;
  public elapsedTime = 0;
  private cleanActions = 0;

  public reset() {
    this.phase = 'loading';
    this.spots = this.dust = this.cleanedSpots = this.collectedDust = 0;
    this.combo = this.comboTimer = this.maxCombo = 0;
    this.score = 0;
    this.elapsedTime = 0;
    this.cleanActions = 0;
  }

  public begin(spots: number, dust: number) {
    this.reset();
    this.spots = spots;
    this.dust = dust;
    this.phase = spots + dust > 0 ? 'cleaning' : 'loading';
  }

  public update(cleanedSpots: number, collectedDust: number, docked: boolean) {
    if (this.phase === 'loading' || this.phase === 'complete') return;
    this.cleanedSpots = Math.min(this.spots, cleanedSpots);
    this.collectedDust = Math.min(this.dust, collectedDust);
    if (this.cleanedSpots === this.spots && this.collectedDust === this.dust) {
      this.phase = docked ? 'complete' : 'returning';
    }
  }

  /** Call every physics step to advance timers. */
  public tick(deltaTime: number) {
    if (this.phase === 'cleaning' || this.phase === 'returning') {
      this.elapsedTime += deltaTime;
    }
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - deltaTime);
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  /** Register a clean action (sweep, mop, or dust pickup). Returns score gained. */
  public registerClean(battery: number): number {
    this.cleanActions += 1;
    this.combo = Math.min(COMBO_MAX, this.combo + 1);
    this.comboTimer = COMBO_TIMEOUT;
    this.maxCombo = Math.max(this.maxCombo, this.combo);

    const baseScore = 100;
    const comboMultiplier = 1 + (this.combo - 1) * 0.25;
    const batteryBonus = battery > 60 ? 1.2 : battery > 30 ? 1.0 : 0.8;
    const gained = Math.round(baseScore * comboMultiplier * batteryBonus);
    this.score += gained;
    return gained;
  }

  /** Calculate star rating for end-of-day report. */
  public getStarRating(battery: number, parTime: number): StarRating {
    // Battery stars
    let batteryStars = 0;
    for (const threshold of STAR_THRESHOLDS.battery) {
      if (battery >= threshold) batteryStars += 1;
    }

    // Time stars – compare elapsed time against par.
    let timeStars = 0;
    const timeRatio = this.elapsedTime / Math.max(1, parTime);
    if (timeRatio <= 0.6) timeStars = 3;
    else if (timeRatio <= 0.85) timeStars = 2;
    else if (timeRatio <= 1.15) timeStars = 1;

    const total = Math.round((batteryStars + timeStars) / 2);
    return { batteryStars, timeStars, total };
  }

  public get objectiveText() {
    if (this.phase === 'loading') return 'Đang chuẩn bị nhà…';
    if (this.phase === 'returning') return 'Nhà đã sạch · Về trạm để kết thúc ca.';
    if (this.phase === 'complete') return 'Ca dọn hoàn thành · Mở nhật ký gia đình.';
    return `Vết bẩn ${this.cleanedSpots}/${this.spots} · Bụi ${this.collectedDust}/${this.dust}`;
  }

  public get comboText(): string {
    if (this.combo <= 1) return '';
    return `×${this.combo}`;
  }

  public get progressPercent(): number {
    const total = this.spots + this.dust;
    if (total <= 0) return 0;
    return Math.min(100, ((this.cleanedSpots + this.collectedDust) / total) * 100);
  }
}
