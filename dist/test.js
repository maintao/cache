"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const index_2 = require("./index");
describe("MemoryCache", () => {
    let cache;
    beforeEach(() => {
        // 在每个测试用例开始之前，创建一个新的 MemoryCache 实例
        cache = new index_1.MemoryCache({ logCacheMiss: true, logCacheHit: true, logSet: true });
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
    it("should getOrSet item", () => __awaiter(void 0, void 0, void 0, function* () {
        const key = "key";
        const maxAge = 1;
        const fnGetValue = () => __awaiter(void 0, void 0, void 0, function* () { return "value"; });
        const value = yield cache.getOrSet(key, fnGetValue, maxAge);
        expect(value).toBe("value");
        // 再次调用 getOrSet 时，应该从缓存中获取值
        const cachedValue = yield cache.getOrSet(key, fnGetValue, maxAge);
        expect(cachedValue).toBe("value");
    }));
});
describe("RedisCache", () => {
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const createMockRedis = () => {
        const store = {};
        return {
            get(key) {
                return __awaiter(this, void 0, void 0, function* () {
                    const item = store[key];
                    if (!item)
                        return null;
                    const now = Date.now();
                    if (item.expiry !== undefined && item.expiry <= now) {
                        delete store[key];
                        return null;
                    }
                    return item.value;
                });
            },
            set(key, value, ...args) {
                return __awaiter(this, void 0, void 0, function* () {
                    const item = { value };
                    if (args.length >= 2 && String(args[0]).toUpperCase() === "EX") {
                        const ttl = Number(args[1]) || 0;
                        if (ttl > 0)
                            item.expiry = Date.now() + ttl * 1000;
                    }
                    store[key] = item;
                    return "OK";
                });
            },
        };
    };
    it("should allow setting and getting items", () => __awaiter(void 0, void 0, void 0, function* () {
        const client = createMockRedis();
        const cache = new index_2.RedisCache(client, { keyPrefix: "test:" });
        yield cache.set("key", { a: 1 }, 5);
        const value = yield cache.get("key");
        expect(value).toEqual({ a: 1 });
    }));
    it("should return null for missing items", () => __awaiter(void 0, void 0, void 0, function* () {
        const client = createMockRedis();
        const cache = new index_2.RedisCache(client, { keyPrefix: "test:" });
        const value = yield cache.get("missing-key");
        expect(value).toBeNull();
    }));
    it("should expire items after TTL", () => __awaiter(void 0, void 0, void 0, function* () {
        const client = createMockRedis();
        const cache = new index_2.RedisCache(client, { keyPrefix: "test:" });
        yield cache.set("key", "value", 1);
        yield sleep(1100);
        const value = yield cache.get("key");
        expect(value).toBeNull();
    }));
    it("should getOrSet item and reuse cached value", () => __awaiter(void 0, void 0, void 0, function* () {
        const client = createMockRedis();
        const cache = new index_2.RedisCache(client, { keyPrefix: "test:" });
        let calls = 0;
        const fnGetValue = () => __awaiter(void 0, void 0, void 0, function* () {
            calls += 1;
            return { v: "value" };
        });
        const v1 = yield cache.getOrSet("key", fnGetValue, 5);
        expect(v1).toEqual({ v: "value" });
        const v2 = yield cache.getOrSet("key", fnGetValue, 5);
        expect(v2).toEqual({ v: "value" });
        expect(calls).toBe(1);
    }));
    it("should treat falsy cached values as hit", () => __awaiter(void 0, void 0, void 0, function* () {
        const client = createMockRedis();
        const cache = new index_2.RedisCache(client, { keyPrefix: "test:" });
        let calls = 0;
        const fnGetZero = () => __awaiter(void 0, void 0, void 0, function* () {
            calls += 1;
            return 0;
        });
        const r1 = yield cache.getOrSet("zero", fnGetZero, 5);
        expect(r1).toBe(0);
        const r2 = yield cache.getOrSet("zero", fnGetZero, 5);
        expect(r2).toBe(0);
        expect(calls).toBe(1);
    }));
    it("should deduplicate concurrent getOrSet calls", () => __awaiter(void 0, void 0, void 0, function* () {
        const client = createMockRedis();
        const cache = new index_2.RedisCache(client, { keyPrefix: "test:" });
        let calls = 0;
        const fnSlow = () => __awaiter(void 0, void 0, void 0, function* () {
            calls += 1;
            yield sleep(100);
            return "done";
        });
        const [a, b, c] = yield Promise.all([
            cache.getOrSet("con", fnSlow, 5),
            cache.getOrSet("con", fnSlow, 5),
            cache.getOrSet("con", fnSlow, 5),
        ]);
        expect(a).toBe("done");
        expect(b).toBe("done");
        expect(c).toBe("done");
        expect(calls).toBe(1);
    }));
});
//# sourceMappingURL=test.js.map