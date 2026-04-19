export class UIManager {
  private coordinatesElement: HTMLElement | null;
  private batteryElement: HTMLElement | null;
  private progressElement: HTMLElement | null;
  private storageElement: HTMLElement | null;
  private statusElement: HTMLElement | null;
  private actionElement: HTMLElement | null;

  constructor() {
    this.coordinatesElement = document.getElementById('coordinates');
    this.batteryElement = document.getElementById('battery');
    this.progressElement = document.getElementById('progress');
    this.storageElement = document.getElementById('storage');
    this.statusElement = document.getElementById('status');
    this.actionElement = document.getElementById('action');
  }

  public update(position: string, battery: number, cleaned: number, total: number, storage: number, capacity: number, status: string) {
    if (this.coordinatesElement) {
      this.coordinatesElement.innerHTML = `<strong>XYZ:</strong> ${position}`;
    }
    if (this.batteryElement) {
      this.batteryElement.textContent = `Battery: ${Math.round(battery)}%`;
    }
    if (this.progressElement) {
      this.progressElement.textContent = `Cleaned: ${cleaned} / ${total}`;
    }
    if (this.storageElement) {
      this.storageElement.textContent = `Storage: ${storage} / ${capacity}`;
    }
    if (this.statusElement) {
      this.statusElement.textContent = `Status: ${status}`;
    }
    if (this.actionElement) {
      this.actionElement.textContent = `Press E to suction / scan`; 
    }
  }
}
