/**
 * Domain Value Object: Coordinates
 *
 * Encapsulates GPS latitude & longitude validation, range verification,
 * and detection of synthetic or stripped artifacts like Null Island (0, 0).
 */
export class Coordinates {
  readonly latitude: number | null;
  readonly longitude: number | null;

  constructor(latitude: number | null, longitude: number | null) {
    if (Coordinates.isFiniteNumber(latitude) && Coordinates.isFiniteNumber(longitude)) {
      if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
        this.latitude = latitude;
        this.longitude = longitude;
        return;
      }
    }
    this.latitude = null;
    this.longitude = null;
  }

  private static isFiniteNumber(val: unknown): val is number {
    return typeof val === "number" && Number.isFinite(val);
  }

  /**
   * Returns true if coordinates are present, valid, and not Null Island (0, 0).
   * Null Island is far more often a consequence of stripped metadata than a real location.
   */
  isUsable(): boolean {
    if (this.latitude === null || this.longitude === null) return false;
    if (this.latitude === 0 && this.longitude === 0) return false;
    return true;
  }

  toJSON() {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}
