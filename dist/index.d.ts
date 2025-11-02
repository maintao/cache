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
    delete(key: string): void;
    deleteMany(keyRegex: RegExp): void;
    clear(): void;
    destroy(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map