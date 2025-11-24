interface Cache {
    [key: string]: {
        value: any;
        expiry: number;
    };
}
export declare class MemoryCache {
    cache: Cache;
    private cleanupTimer;
    private readonly GRACE_PERIOD;
    private readonly CLEANUP_INTERVAL;
    constructor();
    private startCleanupTimer;
    private cleanupExpiredItems;
    get(key: string): any;
    set(key: string, value: any, maxAge: number): void;
    /**
     * 尝试获取值，如果不存在或已过期，则执行 fnGetValue 函数生成新值，存入缓存并返回。
     */
    getOrSet(key: string, fnGetValue: () => Promise<any>, maxAge: number): Promise<any>;
    delete(key: string): void;
    deleteMany(keyRegex: RegExp): void;
    clear(): void;
    destroy(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map