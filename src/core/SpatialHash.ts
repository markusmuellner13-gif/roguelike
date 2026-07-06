import type { Vec2 } from './Vec2';

/**
 * Uniform grid broad-phase. With hundreds of enemies and projectiles
 * on screen, naive O(n*m) collision checks become the bottleneck long
 * before rendering does — this keeps queries to nearby cells only.
 */
export class SpatialHash<T extends { pos: Vec2; radius: number }> {
  private cellSize: number;
  private buckets = new Map<string, T[]>();

  constructor(cellSize = 96) {
    this.cellSize = cellSize;
  }

  private keyFor(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  clear(): void {
    this.buckets.clear();
  }

  insert(item: T): void {
    const cx = Math.floor(item.pos.x / this.cellSize);
    const cy = Math.floor(item.pos.y / this.cellSize);
    const k = this.keyFor(cx, cy);
    let bucket = this.buckets.get(k);
    if (!bucket) {
      bucket = [];
      this.buckets.set(k, bucket);
    }
    bucket.push(item);
  }

  /** All items in the 3x3 cell neighborhood around a point. */
  queryNear(pos: Vec2, radius: number): T[] {
    const results: T[] = [];
    const minCx = Math.floor((pos.x - radius) / this.cellSize);
    const maxCx = Math.floor((pos.x + radius) / this.cellSize);
    const minCy = Math.floor((pos.y - radius) / this.cellSize);
    const maxCy = Math.floor((pos.y + radius) / this.cellSize);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.buckets.get(this.keyFor(cx, cy));
        if (bucket) results.push(...bucket);
      }
    }
    return results;
  }
}
