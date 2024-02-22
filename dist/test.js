"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
describe("MemoryCache", () => {
    let cache;
    beforeEach(() => {
        // 在每个测试用例开始之前，创建一个新的 MemoryCache 实例
        cache = new index_1.MemoryCache();
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
});
//# sourceMappingURL=test.js.map