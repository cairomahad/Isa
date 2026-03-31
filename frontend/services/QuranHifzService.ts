import AsyncStorage from '@react-native-async-storage/async-storage';

const API = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const AYAH_CACHE_PREFIX = 'hifz_ayah_';

export interface HifzSurah {
  number: number;
  name: string;
  name_ru: string;
  name_ar: string;
  ayahs: number;
}

export interface HifzProgram {
  id: string;
  user_id: string;
  current_surah: number;
  current_ayah: number;
  is_active: boolean;
  started_at: string;
  evening_hour: number;
  morning_hour: number;
  last_lesson_date: string | null;
  last_review_date: string | null;
  // enriched
  surah_name: string;
  surah_name_ru: string;
  surah_name_ar: string;
  phase: string;
  learned_count: number;
  total_ayahs: number;
  progress_pct: number;
}

export interface HifzAyahRef {
  surah: number;
  ayah: number;
  is_basmala: boolean;
  audio_url: string;
}

export interface HifzAyahData extends HifzAyahRef {
  arabic_text: string;
  transliteration: string;
  surah_name: string;
}

export interface HifzLesson {
  lesson_number: number;
  surah_number: number;
  surah_name: string;
  surah_name_ru: string;
  is_first_lesson: boolean;
  phase: string;
  ayahs: HifzAyahRef[];
}

export interface HifzReview {
  mode: 'panel_a' | 'panel_b';
  all_ayahs: HifzAyahRef[];
  yesterday_ayahs: HifzAyahRef[];
  current_block: {
    block_number: number;
    ayahs: HifzAyahRef[];
    start_ayah: number;
    end_ayah: number;
  } | null;
}

// In-memory cache for ayah text
const memCache = new Map<string, HifzAyahData>();

export const HifzService = {
  async getSurahs(): Promise<HifzSurah[]> {
    const r = await fetch(`${API}/api/quran/hifz/surahs`);
    const d = await r.json();
    return d.surahs || [];
  },

  async getProgram(userId: string): Promise<{ active: boolean; program: HifzProgram | null }> {
    const r = await fetch(`${API}/api/quran/hifz/program/${userId}`);
    return r.json();
  },

  async startProgram(userId: string, surahNumber: number, eveningHour = 21, morningHour = 7): Promise<void> {
    await fetch(`${API}/api/quran/hifz/program/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, surah_number: surahNumber, evening_hour: eveningHour, morning_hour: morningHour }),
    });
  },

  async updateSettings(userId: string, eveningHour: number, morningHour: number): Promise<void> {
    await fetch(`${API}/api/quran/hifz/program/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, evening_hour: eveningHour, morning_hour: morningHour }),
    });
  },

  async changeSurah(userId: string, surahNumber: number): Promise<void> {
    await fetch(`${API}/api/quran/hifz/program/change-surah`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, surah_number: surahNumber }),
    });
  },

  async getLesson(userId: string): Promise<HifzLesson> {
    const r = await fetch(`${API}/api/quran/hifz/lesson/${userId}`);
    if (!r.ok) throw new Error('Не удалось загрузить урок');
    return r.json();
  },

  async completeLesson(userId: string, ayahs: HifzAyahRef[]): Promise<{ points_earned: number; surah_completed: boolean }> {
    const r = await fetch(`${API}/api/quran/hifz/lesson/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ayahs }),
    });
    return r.json();
  },

  async getReview(userId: string): Promise<HifzReview> {
    const r = await fetch(`${API}/api/quran/hifz/review/${userId}`);
    if (!r.ok) throw new Error('Не удалось загрузить повторение');
    return r.json();
  },

  async completeReview(userId: string): Promise<{ points_earned: number }> {
    const r = await fetch(`${API}/api/quran/hifz/review/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    return r.json();
  },

  async getAyahText(surah: number, ayah: number, audioUrl: string): Promise<HifzAyahData> {
    const cacheKey = `${surah}:${ayah}`;

    if (memCache.has(cacheKey)) return memCache.get(cacheKey)!;

    try {
      const stored = await AsyncStorage.getItem(AYAH_CACHE_PREFIX + cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        memCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch {}

    try {
      const r = await fetch(`${API}/api/quran/hifz/ayah/${surah}/${ayah}`);
      const d = await r.json();
      const data: HifzAyahData = {
        surah, ayah, is_basmala: false, audio_url: d.audio_url || audioUrl,
        arabic_text: d.arabic_text || '',
        transliteration: d.transliteration || '',
        surah_name: d.surah_name || '',
      };
      memCache.set(cacheKey, data);
      await AsyncStorage.setItem(AYAH_CACHE_PREFIX + cacheKey, JSON.stringify(data));
      return data;
    } catch {
      return {
        surah, ayah, is_basmala: false, audio_url: audioUrl,
        arabic_text: '(нет соединения)', transliteration: '', surah_name: '',
      };
    }
  },

  async getStats(userId: string) {
    const r = await fetch(`${API}/api/quran/hifz/stats/${userId}`);
    return r.json();
  },

  isLessonDoneToday(program: HifzProgram): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return program.last_lesson_date === today;
  },

  isReviewDoneToday(program: HifzProgram): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return program.last_review_date === today;
  },
};
