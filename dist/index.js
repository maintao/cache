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
exports.RedisCache = exports.MemoryCache = void 0;
class MemoryCache {
    constructor(options = {}) {
        this.cleanupTimer = null;
        this.CLEANUP_INTERVAL = 30 * 1000; // 每30秒清理一次
        const { logCacheMiss = false, logCacheHit = false, logSet = false } = options;
        this.logCacheMiss = logCacheMiss;
        this.logCacheHit = logCacheHit;
        this.logSet = logSet;
        const g = globalThis;
        if (!g.__fnmain_mem_cache__) {
            g.__fnmain_mem_cache__ = {};
        }
        this.cache = g.__fnmain_mem_cache__;
        this.startCleanupTimer();
    }
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredItems();
        }, this.CLEANUP_INTERVAL);
    }
    cleanupExpiredItems() {
        const now = Date.now();
        Object.keys(this.cache).forEach((key) => {
            const cachedItem = this.cache[key];
            if (cachedItem.expiry < now) {
                delete this.cache[key];
            }
        });
    }
    get(key) {
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
        }
        else {
            if (this.logCacheMiss) {
                console.log(`[Cache miss](expired)[${new Date().toLocaleTimeString()}] key=${key}`);
            }
            delete this.cache[key]; // 及时删除过期项
            return null;
        }
    }
    set(key, value, maxAge) {
        const expiry = Date.now() + maxAge * 1000;
        this.cache[key] = { value, expiry };
        if (this.logSet) {
            console.log(`[Cache set][${new Date().toLocaleTimeString()}] key=${key} maxAge=${maxAge}s`);
        }
    }
    /**
     * 尝试获取值，如果不存在或已过期，则执行 fnGetValue 函数生成新值，存入缓存并返回。
     */
    getOrSet(key, fnGetValue, maxAge) {
        return __awaiter(this, void 0, void 0, function* () {
            const cachedValue = this.get(key);
            if (cachedValue !== null) {
                return cachedValue;
            }
            // 缓存未命中，执行 fnGetValue 获取新值
            const newValue = yield fnGetValue();
            this.set(key, newValue, maxAge);
            return newValue;
        });
    }
    delete(key) {
        delete this.cache[key];
    }
    deleteMany(keyRegex) {
        Object.keys(this.cache).forEach((key) => {
            if (keyRegex.test(key)) {
                delete this.cache[key];
            }
        });
    }
    clear() {
        Object.keys(this.cache).forEach((k) => {
            delete this.cache[k];
        });
    }
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.clear();
    }
}
exports.MemoryCache = MemoryCache;
class RedisCache {
    constructor(client, options = {}) {
        this.inflight = {};
        this.client = client;
        const { keyPrefix = "", logCacheMiss = false, logCacheHit = false, serialize, deserialize, } = options;
        this.keyPrefix = keyPrefix;
        this.logCacheMiss = logCacheMiss;
        this.logCacheHit = logCacheHit;
        this.serialize = serialize !== null && serialize !== void 0 ? serialize : ((v) => JSON.stringify(v));
        this.deserialize =
            deserialize !== null && deserialize !== void 0 ? deserialize : ((t) => {
                try {
                    return JSON.parse(t);
                }
                catch (_a) {
                    return t;
                }
            });
    }
    formatKey(key) {
        return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const redisKey = this.formatKey(key);
            const text = yield this.client.get(redisKey);
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
        });
    }
    set(key, value, maxAge) {
        return __awaiter(this, void 0, void 0, function* () {
            const redisKey = this.formatKey(key);
            const text = this.serialize(value);
            // ioredis: 以秒为单位设置 TTL
            yield this.client.set(redisKey, text, "EX", maxAge);
        });
    }
    getOrSet(key, fnGetValue, maxAge) {
        return __awaiter(this, void 0, void 0, function* () {
            const cachedValue = yield this.get(key);
            if (cachedValue !== null) {
                return cachedValue;
            }
            // 并发去重：同一个 key 的计算只进行一次
            const existing = this.inflight[key];
            if (existing !== undefined) {
                return existing;
            }
            const promise = (() => __awaiter(this, void 0, void 0, function* () {
                const computed = yield fnGetValue();
                // 二次确认：计算期间若已有其他写入则直接返回最新值，避免覆盖
                const latest = yield this.get(key);
                if (latest !== null) {
                    return latest;
                }
                yield this.set(key, computed, maxAge);
                return computed;
            }))();
            this.inflight[key] = promise;
            // 使用 then/catch 清理占位，避免依赖 Promise.finally
            promise.then(() => {
                delete this.inflight[key];
            }, () => {
                delete this.inflight[key];
            });
            return promise;
        });
    }
}
exports.RedisCache = RedisCache;
//# sourceMappingURL=index.js.map