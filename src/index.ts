interface Cache {
  [key: string]: {
    value: any;
    expiry: number;
  };
}

export class MemoryCache {
  cache: Cache = {};
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly GRACE_PERIOD = 30 * 1000; // 30秒宽限期
  private readonly CLEANUP_INTERVAL = 30 * 1000; // 每30秒清理一次

  constructor() {
    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredItems();
    }, this.CLEANUP_INTERVAL);
  }

  private cleanupExpiredItems(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach((key) => {
      const cachedItem = this.cache[key];
      // 只删除过期超过宽限期的数据
      if (cachedItem.expiry + this.GRACE_PERIOD < now) {
        delete this.cache[key];
      }
    });
  }

  get(key: string): any {
    const cachedItem = this.cache[key];

    if (!cachedItem) {
      return null;
    }

    const now = Date.now();

    // 只检查是否过期，不删除数据
    if (cachedItem.expiry > now) {
      return cachedItem.value;
    } else {
      return null;
    }
  }

  set(key: string, value: any, maxAge: number): void {
    const expiry = Date.now() + maxAge * 1000;
    this.cache[key] = { value, expiry };
  }

  delete(key: string): void {
    delete this.cache[key];
  }

  deleteMany(keyRegex: RegExp): void {
    Object.keys(this.cache).forEach((key) => {
      if (keyRegex.test(key)) {
        delete this.cache[key];
      }
    });
  }

  clear(): void {
    this.cache = {};
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}
