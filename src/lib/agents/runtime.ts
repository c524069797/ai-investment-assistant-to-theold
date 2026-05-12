interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

const cache = new Map<string, CacheEntry<unknown>>();

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function getCachedOrRun<T>(
  key: string,
  ttlMs: number,
  force: boolean,
  runner: () => Promise<T>,
) {
  if (!force) {
    const existing = cache.get(key) as CacheEntry<T> | undefined;
    if (existing && existing.expiresAt > Date.now()) {
      return existing.data;
    }
  }

  const data = await runner();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

export function hasModelConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}
