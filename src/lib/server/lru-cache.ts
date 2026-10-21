/** Small least-recently-used cache, so repeat requests for the same plan skip the model call. */
export class LruCache<V> {
  private readonly items = new Map<string, V>();

  constructor(private readonly capacity: number) {}

  get(key: string): V | undefined {
    const value = this.items.get(key);
    if (value === undefined) return undefined;
    // Re-insert to mark as most recently used.
    this.items.delete(key);
    this.items.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    this.items.delete(key);
    this.items.set(key, value);
    if (this.items.size > this.capacity) {
      const oldest = this.items.keys().next().value;
      if (oldest !== undefined) this.items.delete(oldest);
    }
  }
}
