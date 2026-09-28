export type MissionPhase = 'loading' | 'cleaning' | 'returning' | 'complete';

/** Objectives derive from what actually spawned, so small rooms remain finishable. */
export class MissionSystem {
  public phase: MissionPhase = 'loading';
  public spots = 0;
  public dust = 0;
  public cleanedSpots = 0;
  public collectedDust = 0;

  public reset() {
    this.phase = 'loading';
    this.spots = this.dust = this.cleanedSpots = this.collectedDust = 0;
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

  public get objectiveText() {
    if (this.phase === 'loading') return 'Đang chuẩn bị nhà…';
    if (this.phase === 'returning') return 'Nhà đã sạch · Về trạm để kết thúc ca.';
    if (this.phase === 'complete') return 'Ca dọn hoàn thành · Mở nhật ký gia đình.';
    return `Vết bẩn ${this.cleanedSpots}/${this.spots} · Bụi ${this.collectedDust}/${this.dust}`;
  }
}
