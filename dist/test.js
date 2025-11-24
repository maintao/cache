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
//# sourceMappingURL=test.js.map