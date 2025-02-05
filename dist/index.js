"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = void 0;
class MemoryCache {
    constructor() {
        this.cache = {};
    }
    get(key) {
        const cachedItem = this.cache[key];
        if (!cachedItem) {
            return null;
        }
        const now = Date.now();
        if (cachedItem.expiry > now) {
            return cachedItem.value;
        }
        else {
            delete this.cache[key];
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
}
exports.MemoryCache = MemoryCache;
//# sourceMappingURL=index.js.map