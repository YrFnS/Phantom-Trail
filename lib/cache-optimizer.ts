export interface CacheOptions {
  maxSize: number; // Maximum number of entries
  maxAge?: number; // Maximum age in milliseconds
  onEvict?: (key: string, value: any) => void;
}

export class LRUCache<T> {
  private cache: Map<string, { value: T; timestamp: number; accessCount: number }> = new Map();
  private maxSize: number;
  private maxAge?: number;
  private onEvict?: (key: string, value: T) => void;

  constructor(options: CacheOptions) {
    this.maxSize = options.maxSize;
    this.maxAge = options.maxAge;
    this.onEvict = options.onEvict;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (this.maxAge && Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access info (LRU)
    entry.accessCount++;
    entry.timestamp = Date.now();
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T): void {
    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  prune(): number {
    let evicted = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (this.maxAge && now - entry.timestamp > this.maxAge) {
        if (this.onEvict) {
          this.onEvict(key, entry.value);
        }
        this.cache.delete(key);
        evicted++;
      }
    }

    return evicted;
  }

  private evictLRU(): void {
    // Find least recently used (first entry in Map)
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      const entry = this.cache.get(firstKey);
      if (entry && this.onEvict) {
        this.onEvict(firstKey, entry.value);
      }
      this.cache.delete(firstKey);
    }
  }

  getStats() {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      averageAge: entries.reduce((sum, entry) => sum + (Date.now() - entry.timestamp), 0) / entries.length,
      totalAccesses: entries.reduce((sum, entry) => sum + entry.accessCount, 0)
    };
  }
}

export interface MemoryMetrics {
  totalUsage: number; // bytes
  heapUsage: number;
  cacheUsage: number;
  eventStorageUsage: number;
}

export class CacheOptimizer {
  private caches: Map<string, LRUCache<any>> = new Map();
  private maxTotalMemory: number = 100 * 1024 * 1024; // 100MB
  private cleanupInterval: number = 60000; // 1 minute
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(maxMemoryMB: number = 100) {
    this.maxTotalMemory = maxMemoryMB * 1024 * 1024;
    this.startCleanupTimer();
  }

  createCache<T>(name: string, options: CacheOptions): LRUCache<T> {
    const cache = new LRUCache<T>({
      ...options,
      onEvict: (key, value) => {
        console.debug(`Cache eviction: ${name}:${key}`);
        options.onEvict?.(key, value);
      }
    });

    this.caches.set(name, cache);
    return cache;
  }

  getCache<T>(name: string): LRUCache<T> | undefined {
    return this.caches.get(name) as LRUCache<T>;
  }

  async getMemoryMetrics(): Promise<MemoryMetrics> {
    const performance = (window as any).performance;
    
    let heapUsage = 0;
    if (performance?.memory) {
      heapUsage = performance.memory.usedJSHeapSize;
    }

    let cacheUsage = 0;
    for (const cache of this.caches.values()) {
      cacheUsage += cache.size() * 1024; // Rough estimate
    }

    // Estimate event storage usage
    let eventStorageUsage = 0;
    try {
      const storage = await chrome.storage.local.getBytesInUse();
      eventStorageUsage = storage;
    } catch (error) {
      console.warn('Could not get storage usage:', error);
    }

    return {
      totalUsage: heapUsage + cacheUsage + eventStorageUsage,
      heapUsage,
      cacheUsage,
      eventStorageUsage
    };
  }

  async performCleanup(): Promise<void> {
    console.debug('Performing memory cleanup');

    // Prune expired entries from all caches
    let totalEvicted = 0;
    for (const [name, cache] of this.caches.entries()) {
      const evicted = cache.prune();
      totalEvicted += evicted;
      console.debug(`Pruned ${evicted} entries from cache: ${name}`);
    }

    // Check if we need more aggressive cleanup
    const metrics = await this.getMemoryMetrics();
    if (metrics.totalUsage > this.maxTotalMemory) {
      await this.aggressiveCleanup();
    }

    console.debug(`Memory cleanup complete. Evicted ${totalEvicted} entries.`);
  }

  private async aggressiveCleanup(): Promise<void> {
    console.warn('Performing aggressive memory cleanup');

    // Clear half of each cache
    for (const [name, cache] of this.caches.entries()) {
      const targetSize = Math.floor(cache.size() / 2);
      const keys = cache.keys();
      
      for (let i = 0; i < keys.length - targetSize; i++) {
        cache.delete(keys[i]);
      }
      
      console.debug(`Aggressively cleaned cache: ${name}, new size: ${cache.size()}`);
    }

    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup().catch(console.error);
    }, this.cleanupInterval);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.caches.clear();
  }

  getCacheStats() {
    const stats: Record<string, any> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }
}
