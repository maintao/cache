interface Cache {
    [key: string]: {
        value: any;
        expiry: number;
    };
}
export declare class MemoryCache {
    cache: Cache;
    get(key: string): any;
    set(key: string, value: any, maxAge: number): void;
    delete(key: string): void;
    deleteMany(keyRegex: RegExp): void;
    clear(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map