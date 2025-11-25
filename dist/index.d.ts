interface Cache {
    [key: string]: {
        value: any;
        expiry: number;
    };
}
export declare class MemoryCache {
    cache: Cache;
    private cleanupTimer;
    private readonly CLEANUP_INTERVAL;
    private logCacheMiss;
    private logCacheHit;
    private logSet;
    private instanceId;
    constructor(options?: {
        logCacheMiss?: boolean;
        logCacheHit?: boolean;
        logSet?: boolean;
    });
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
export declare class RedisCache {
    private client;
    private keyPrefix;
    private logCacheMiss;
    private logCacheHit;
    private inflight;
    private serialize;
    private deserialize;
    constructor(client: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string, ...args: any[]) => Promise<any>;
    }, options?: {
        keyPrefix?: string;
        logCacheMiss?: boolean;
        logCacheHit?: boolean;
        serialize?: (value: any) => string;
        deserialize?: (text: string) => any;
    });
    private formatKey;
    get(key: string): Promise<any>;
    set(key: string, value: any, maxAge: number): Promise<void>;
    getOrSet(key: string, fnGetValue: () => Promise<any>, maxAge: number): Promise<any>;
}
export {};
//# sourceMappingURL=index.d.ts.map