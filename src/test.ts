import { MemoryCache } from "./index";
import { RedisCache } from "./index";

describe("MemoryCache", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    // 在每个测试用例开始之前，创建一个新的 MemoryCache 实例
    cache = new MemoryCache({ logCacheMiss: true, logCacheHit: true, logSet: true });
  });

  it("should allow setting and getting items", () => {
    cache.set("key", "value", 1);
    const value = cache.get("key");
    expect(value).toBe("value");
  });

  it("should return null for missing items", () => {
    const value = cache.get("missing-key");
    expect(value).toBeNull();
  });

  it("should delete items", () => {
    cache.set("key", "value", 1);
    cache.delete("key");
    const value = cache.get("key");
    expect(value).toBeNull();
  });

  it("should delete many items", () => {
    cache.set("key:1", "value1", 1);
    cache.set("key:2", "value2", 1);
    cache.deleteMany(/^key:/);
    expect(cache.get("key:1")).toBeNull();
    expect(cache.get("key:2")).toBeNull();
  });

  it("should clear all items", () => {
    cache.set("key1", "value1", 1);
    cache.set("key2", "value2", 1);
    cache.clear();
    expect(cache.get("key1")).toBeNull();
    expect(cache.get("key2")).toBeNull();
  });

  it("should expire items after maxAge", (done) => {
    cache.set("key", "value", 1);
    setTimeout(() => {
      const value = cache.get("key");
      expect(value).toBeNull();
      done();
    }, 1100);
  });

  it("should getOrSet item", async () => {
    const key = "key";
    const maxAge = 1;
    const fnGetValue = async () => "value";

    const value = await cache.getOrSet(key, fnGetValue, maxAge);
    expect(value).toBe("value");

    // 再次调用 getOrSet 时，应该从缓存中获取值
    const cachedValue = await cache.getOrSet(key, fnGetValue, maxAge);
    expect(cachedValue).toBe("value");
  });
});

describe("RedisCache", () => {
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  type StoreItem = { value: string; expiry?: number };
  const createMockRedis = () => {
    const store: Record<string, StoreItem> = {};
    return {
      async get(key: string): Promise<string | null> {
        const item = store[key];
        if (!item) return null;
        const now = Date.now();
        if (item.expiry !== undefined && item.expiry <= now) {
          delete store[key];
          return null;
        }
        return item.value;
      },
      async set(key: string, value: string, ...args: any[]): Promise<string> {
        const item: StoreItem = { value };
        if (args.length >= 2 && String(args[0]).toUpperCase() === "EX") {
          const ttl = Number(args[1]) || 0;
          if (ttl > 0) item.expiry = Date.now() + ttl * 1000;
        }
        store[key] = item;
        return "OK";
      },
    };
  };

  it("should allow setting and getting items", async () => {
    const client = createMockRedis();
    const cache = new RedisCache(client, { keyPrefix: "test:" });
    await cache.set("key", { a: 1 }, 5);
    const value = await cache.get("key");
    expect(value).toEqual({ a: 1 });
  });

  it("should return null for missing items", async () => {
    const client = createMockRedis();
    const cache = new RedisCache(client, { keyPrefix: "test:" });
    const value = await cache.get("missing-key");
    expect(value).toBeNull();
  });

  it("should expire items after TTL", async () => {
    const client = createMockRedis();
    const cache = new RedisCache(client, { keyPrefix: "test:" });
    await cache.set("key", "value", 1);
    await sleep(1100);
    const value = await cache.get("key");
    expect(value).toBeNull();
  });

  it("should getOrSet item and reuse cached value", async () => {
    const client = createMockRedis();
    const cache = new RedisCache(client, { keyPrefix: "test:" });
    let calls = 0;
    const fnGetValue = async () => {
      calls += 1;
      return { v: "value" };
    };
    const v1 = await cache.getOrSet("key", fnGetValue, 5);
    expect(v1).toEqual({ v: "value" });
    const v2 = await cache.getOrSet("key", fnGetValue, 5);
    expect(v2).toEqual({ v: "value" });
    expect(calls).toBe(1);
  });

  it("should treat falsy cached values as hit", async () => {
    const client = createMockRedis();
    const cache = new RedisCache(client, { keyPrefix: "test:" });
    let calls = 0;
    const fnGetZero = async () => {
      calls += 1;
      return 0;
    };
    const r1 = await cache.getOrSet("zero", fnGetZero, 5);
    expect(r1).toBe(0);
    const r2 = await cache.getOrSet("zero", fnGetZero, 5);
    expect(r2).toBe(0);
    expect(calls).toBe(1);
  });

  it("should deduplicate concurrent getOrSet calls", async () => {
    const client = createMockRedis();
    const cache = new RedisCache(client, { keyPrefix: "test:" });

    let calls = 0;
    const fnSlow = async () => {
      calls += 1;
      await sleep(100);
      return "done";
    };

    const [a, b, c] = await Promise.all([
      cache.getOrSet("con", fnSlow, 5),
      cache.getOrSet("con", fnSlow, 5),
      cache.getOrSet("con", fnSlow, 5),
    ]);

    expect(a).toBe("done");
    expect(b).toBe("done");
    expect(c).toBe("done");
    expect(calls).toBe(1);
  });
});
