import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'app_cache_';

export const Cache = {
  async get<T>(key: string, ttlMs = 5 * 60 * 1000): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > ttlMs) {
        await AsyncStorage.removeItem(PREFIX + key);
        return null;
      }
      return data as T;
    } catch {
      return null;
    }
  },

  async set(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
    } catch {}
  },

  async clear(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREFIX + key);
    } catch {}
  },

  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch {}
  },
};

// TTL constants
export const TTL = {
  HADITH_DAILY: 24 * 60 * 60 * 1000,      // 24 hours
  PRAYERS:      12 * 60 * 60 * 1000,       // 12 hours
  PUBLIC_QA:    10 * 60 * 1000,            // 10 minutes
  HADITHS_LIST: 30 * 60 * 1000,            // 30 minutes
  FEED:          2 * 60 * 1000,            // 2 minutes
};
