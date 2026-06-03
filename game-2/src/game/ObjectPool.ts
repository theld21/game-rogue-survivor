export class ObjectPool<T> {
  private activeItems: T[] = [];
  private pool: T[] = [];
  
  private createFn: () => T;
  private resetFn: (item: T) => void;

  constructor(createFn: () => T, resetFn: (item: T) => void, initialSize: number = 0) {
    this.createFn = createFn;
    this.resetFn = resetFn;

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  /**
   * Spawns an item from the pool. Creates a new one if pool is empty.
   */
  spawn(): T {
    let item: T;
    if (this.pool.length > 0) {
      item = this.pool.pop()!;
    } else {
      item = this.createFn();
    }
    this.activeItems.push(item);
    return item;
  }

  /**
   * Recycles an active item back into the pool.
   */
  recycle(item: T): void {
    const idx = this.activeItems.indexOf(item);
    if (idx !== -1) {
      this.activeItems.splice(idx, 1);
      this.resetFn(item);
      this.pool.push(item);
    }
  }

  /**
   * Recycles all active items.
   */
  recycleAll(): void {
    // Copy activeItems to avoid indexing issues during loop
    const toRecycle = [...this.activeItems];
    for (const item of toRecycle) {
      this.recycle(item);
    }
  }

  getActiveItems(): T[] {
    return this.activeItems;
  }

  getPoolSize(): number {
    return this.pool.length;
  }

  getActiveCount(): number {
    return this.activeItems.length;
  }
}
export default ObjectPool;
