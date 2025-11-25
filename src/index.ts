interface Cache {
  [key: string]: {
    value: any;
    expiry: number;
  };
}

export class MemoryCache {
  cache: Cache = {};
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private readonly CLEANUP_INTERVAL = 30 * 1000; // 每30秒清理一次
  private logCacheMiss: boolean;
  private logCacheHit: boolean;
  private logSet: boolean;

  constructor(options: { logCacheMiss?: boolean; logCacheHit?: boolean; logSet?: boolean } = {}) {
    const { logCacheMiss = false, logCacheHit = false, logSet = false } = options;
    this.logCacheMiss = logCacheMiss;
    this.logCacheHit = logCacheHit;
    this.logSet = logSet;
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
      if (cachedItem.expiry < now) {
        delete this.cache[key];
      }
    });
  }

  get(key: string): any {
    const cachedItem = this.cache[key];

    if (!cachedItem) {
      if (this.logCacheMiss) {
        console.log(`[Cache miss][${new Date().toLocaleTimeString()}] key=${key}`);
      }
      return null;
    }

    const now = Date.now();

    if (cachedItem.expiry > now) {
      if (this.logCacheHit) {
        console.log(`[Cache hit][${new Date().toLocaleTimeString()}] key=${key}`);
      }
      return cachedItem.value;
    } else {
      if (this.logCacheMiss) {
        console.log(`[Cache miss](expired)[${new Date().toLocaleTimeString()}] key=${key}`);
      }
      delete this.cache[key]; // 及时删除过期项
      return null;
    }
  }

  set(key: string, value: any, maxAge: number): void {
    const expiry = Date.now() + maxAge * 1000;
    this.cache[key] = { value, expiry };
    if (this.logSet) {
      console.log(`[Cache set][${new Date().toLocaleTimeString()}] key=${key} maxAge=${maxAge}s`);
    }
  }

  /**
   * 尝试获取值，如果不存在或已过期，则执行 fnGetValue 函数生成新值，存入缓存并返回。
   */
  async getOrSet(key: string, fnGetValue: () => Promise<any>, maxAge: number): Promise<any> {
    const cachedValue = this.get(key);
    if (cachedValue) {
      return cachedValue;
    }

    // 缓存未命中，执行 fnGetValue 获取新值
    const newValue = await fnGetValue();
    this.set(key, newValue, maxAge);
    return newValue;
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
