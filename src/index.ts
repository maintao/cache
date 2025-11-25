interface Cache {
  [key: string]: {
    value: any;
    expiry: number;
  };
}

export class MemoryCache {
  cache!: Cache;
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
    const g = globalThis as any;
    if (!g.__fnmain_mem_cache__) {
      g.__fnmain_mem_cache__ = {};
    }
    this.cache = g.__fnmain_mem_cache__ as Cache;
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
    if (cachedValue !== null) {
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
    Object.keys(this.cache).forEach((k) => {
      delete this.cache[k];
    });
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

export class RedisCache {
  private client: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, ...args: any[]) => Promise<any>;
  };
  private keyPrefix: string;
  private logCacheMiss: boolean;
  private logCacheHit: boolean;
  private inflight: { [key: string]: Promise<any> | undefined } = {};
  private serialize: (value: any) => string;
  private deserialize: (text: string) => any;

  constructor(
    client: {
      get: (key: string) => Promise<string | null>;
      set: (key: string, value: string, ...args: any[]) => Promise<any>;
    },
    options: {
      keyPrefix?: string;
      logCacheMiss?: boolean;
      logCacheHit?: boolean;
      serialize?: (value: any) => string;
      deserialize?: (text: string) => any;
    } = {}
  ) {
    this.client = client;
    const {
      keyPrefix = "",
      logCacheMiss = false,
      logCacheHit = false,
      serialize,
      deserialize,
    } = options;
    this.keyPrefix = keyPrefix;
    this.logCacheMiss = logCacheMiss;
    this.logCacheHit = logCacheHit;
    this.serialize = serialize ?? ((v: any) => JSON.stringify(v));
    this.deserialize =
      deserialize ??
      ((t: string) => {
        try {
          return JSON.parse(t);
        } catch {
          return t;
        }
      });
  }

  private formatKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
  }

  async get(key: string): Promise<any> {
    const redisKey = this.formatKey(key);
    const text = await this.client.get(redisKey);
    if (text === null) {
      if (this.logCacheMiss) {
        console.log(`[Cache miss] key=${key}`);
      }
      return null;
    }
    if (this.logCacheHit) {
      console.log(`[Cache hit] key=${key}`);
    }
    return this.deserialize(text);
  }

  async set(key: string, value: any, maxAge: number): Promise<void> {
    const redisKey = this.formatKey(key);
    const text = this.serialize(value);
    // ioredis: 以秒为单位设置 TTL
    await this.client.set(redisKey, text, "EX", maxAge);
  }

  async getOrSet(key: string, fnGetValue: () => Promise<any>, maxAge: number): Promise<any> {
    const cachedValue = await this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // 并发去重：同一个 key 的计算只进行一次
    const existing = this.inflight[key];
    if (existing !== undefined) {
      return existing;
    }

    const promise = (async () => {
      const computed = await fnGetValue();
      // 二次确认：计算期间若已有其他写入则直接返回最新值，避免覆盖
      const latest = await this.get(key);
      if (latest !== null) {
        return latest;
      }
      await this.set(key, computed, maxAge);
      return computed;
    })();

    this.inflight[key] = promise;
    // 使用 then/catch 清理占位，避免依赖 Promise.finally
    promise.then(
      () => {
        delete this.inflight[key];
      },
      () => {
        delete this.inflight[key];
      }
    );

    return promise;
  }
}
