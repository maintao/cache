interface Cache {
  [key: string]: {
    value: any;
    expiry: number;
  };
}

export class MemoryCache {
  cache: Cache = {};

  get(key: string): any {
    const cachedItem = this.cache[key];

    if (!cachedItem) {
      return null;
    }

    const now = Date.now();

    if (cachedItem.expiry > now) {
      return cachedItem.value;
    } else {
      delete this.cache[key];
      return null;
    }
  }

  set(key: string, value: any, maxAge: number): void {
    const expiry = Date.now() + maxAge * 1000;
    this.cache[key] = { value, expiry };
  }

  delete(key: string): void {
    delete this.cache[key];
  }

  deleteMany(keyRegex: RegExp): void {
    Object.keys(this.cache).forEach((key) => {
      if (keyRegex.test(key)) {
        delete this.cache[key];
      }
    });
  }

  clear(): void {
    this.cache = {};
  }
}
