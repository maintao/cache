"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = void 0;
class MemoryCache {
    constructor() {
        this.cache = {};
        this.cleanupTimer = null;
        this.GRACE_PERIOD = 30 * 1000; // 30秒宽限期
        this.CLEANUP_INTERVAL = 30 * 1000; // 每30秒清理一次
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
            // 只删除过期超过宽限期的数据
            if (cachedItem.expiry + this.GRACE_PERIOD < now) {
                delete this.cache[key];
            }
        });
    }
    get(key) {
        const cachedItem = this.cache[key];
        if (!cachedItem) {
            return null;
        }
        const now = Date.now();
        // 只检查是否过期，不删除数据
        if (cachedItem.expiry > now) {
            return cachedItem.value;
        }
        else {
            return null;
        }
    }
    set(key, value, maxAge) {
        const expiry = Date.now() + maxAge * 1000;
        this.cache[key] = { value, expiry };
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
        this.cache = {};
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
//# sourceMappingURL=index.js.map