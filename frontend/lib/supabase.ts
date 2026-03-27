import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Platform-aware storage:
// - React Native (Expo Go): AsyncStorage
// - Web/SSR: localStorage with safety checks
let storage: any;

if (Platform.OS === 'web') {
  storage = {
    getItem: async (key: string): Promise<string | null> => {
      if (typeof window === 'undefined') return null;
      return window.localStorage?.getItem(key) ?? null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (typeof window === 'undefined') return;
      window.localStorage?.setItem(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
      if (typeof window === 'undefined') return;
      window.localStorage?.removeItem(key);
    },
  };
} else {
  // React Native - use AsyncStorage
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  storage = AsyncStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
