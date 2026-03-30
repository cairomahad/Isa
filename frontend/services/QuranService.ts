import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface QuranProgram {
  id: number;
  telegram_id: number;
  is_active: boolean;
  started_at: string;
  study_week: number;
  current_surah: number;
  current_ayah: number;
  evening_hour: number;
  morning_hour: number;
  last_lesson_date: string | null;
  last_review_date: string | null;
}

export interface AyahData {
  surah: number;
  surahNameEn: string;
  surahNameAr: string;
  ayah: number;
  numberInQuran: number;
  arabic: string;
  translit: string;
  audioUrl: string;
}

export interface QuranReview {
  id: number;
  telegram_id: number;
  surah: number;
  ayah: number;
  due_date: string;
  review_number: number;
  completed: boolean;
}

export interface PhaseConfig {
  maxAyahs: number;
  phase: string;
}

export interface QuranStats {
  learned: number;
  mastered: number;
  inReview: number;
  dueTodayCount: number;
  week: number;
  phase: string;
}

// ─── Cache ───────────────────────────────────────────────────────────────────
const memCache = new Map<string, AyahData>();
const CACHE_PREFIX = 'quran_ayah_';

const surahAyahCount: Record<number, number> = {};

// ─── Service ─────────────────────────────────────────────────────────────────
export const QuranService = {

  /** Get telegram_id for a user UUID */
  async getTelegramId(userId: string): Promise<number | null> {
    const { data } = await supabase
      .from('users')
      .select('telegram_id')
      .eq('id', userId)
      .single();
    return data?.telegram_id ?? null;
  },

  /** Calculate study week (capped at 12) */
  calcStudyWeek(startedAt: string): number {
    const start = new Date(startedAt);
    const now = new Date();
    const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.floor(days / 7) + 1, 12);
  },

  /** Phase config by week */
  getPortionConfig(week: number): PhaseConfig {
    if (week <= 4) return { maxAyahs: 2, phase: 'Разминка' };
    if (week <= 8) return { maxAyahs: 5, phase: 'Нагрузка' };
    return { maxAyahs: 10, phase: 'Плато' };
  },

  /** Get total ayahs in a surah */
  async getSurahLength(surah: number): Promise<number> {
    if (surahAyahCount[surah]) return surahAyahCount[surah];
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah}`);
      const json = await res.json();
      const count = json?.data?.numberOfAyahs ?? 7;
      surahAyahCount[surah] = count;
      return count;
    } catch {
      return 7;
    }
  },

  /** Fetch single ayah with cache */
  async getAyah(surah: number, ayah: number): Promise<AyahData> {
    const key = `${surah}:${ayah}`;

    // 1. Memory cache
    if (memCache.has(key)) return memCache.get(key)!;

    // 2. AsyncStorage cache
    try {
      const stored = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (stored) {
        const parsed: AyahData = JSON.parse(stored);
        memCache.set(key, parsed);
        return parsed;
      }
    } catch {}

    // 3. Fetch from API
    try {
      const res = await fetch(
        `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-uthmani,en.transliteration`
      );
      const json = await res.json();
      const [arabic, translit] = json?.data ?? [];

      const data: AyahData = {
        surah,
        surahNameEn: arabic?.surah?.englishName ?? `Surah ${surah}`,
        surahNameAr: arabic?.surah?.name ?? '',
        ayah,
        numberInQuran: arabic?.numberInQuran ?? 0,
        arabic: arabic?.text ?? '',
        translit: translit?.text ?? '',
        audioUrl: `https://cdn.islamic.network/quran/audio/128/ar.husary/${arabic?.numberInQuran ?? 1}.mp3`,
      };

      memCache.set(key, data);
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
      return data;
    } catch (e) {
      // Offline fallback
      return {
        surah, surahNameEn: `Surah ${surah}`, surahNameAr: '',
        ayah, numberInQuran: 0,
        arabic: '(офлайн — нет соединения)', translit: '',
        audioUrl: '',
      };
    }
  },

  /** Build lesson ayahs for given position */
  async buildLessonAyahs(
    surah: number,
    startAyah: number,
    week: number
  ): Promise<{ ayahs: AyahData[]; nextSurah: number; nextAyah: number }> {
    const { maxAyahs } = this.getPortionConfig(week);
    const ayahs: AyahData[] = [];
    let s = surah;
    let a = startAyah;

    for (let i = 0; i < maxAyahs; i++) {
      const total = await this.getSurahLength(s);
      if (a > total) {
        s += 1;
        a = 1;
        if (s > 114) break;
      }
      const ayahData = await this.getAyah(s, a);
      ayahs.push(ayahData);
      a++;
    }

    const lastTotal = await this.getSurahLength(s);
    let nextSurah = s;
    let nextAyah = a;
    if (a > lastTotal) { nextSurah = s + 1; nextAyah = 1; }

    return { ayahs, nextSurah, nextAyah };
  },

  /** Check if today is Friday */
  isFriday(): boolean {
    return new Date().getDay() === 5;
  },

  /** Check stop-mechanism: overdue reviews + learned >= 3 */
  async hasOverdueReviews(telegramId: number): Promise<boolean> {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const prog = await this.getProgram(telegramId);
    if (!prog) return false;

    const { count: learnedCount } = await supabase
      .from('quran_progress')
      .select('id', { count: 'exact', head: true })
      .eq('telegram_id', telegramId);

    if ((learnedCount ?? 0) < 3) return false;

    if (!prog.last_review_date) return true;
    return prog.last_review_date < twoDaysAgo;
  },

  /** Get program by telegram_id */
  async getProgram(telegramId: number): Promise<QuranProgram | null> {
    const { data } = await supabase
      .from('quran_program')
      .select('*')
      .eq('telegram_id', telegramId)
      .single();
    return data ?? null;
  },

  /** Start new program */
  async startProgram(telegramId: number, surah: number, ayah: number): Promise<QuranProgram> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('quran_program')
      .upsert({
        telegram_id: telegramId,
        is_active: true,
        started_at: now,
        study_week: 1,
        current_surah: surah,
        current_ayah: ayah,
        evening_hour: 20,
        morning_hour: 7,
        last_lesson_date: null,
        last_review_date: null,
        created_at: now,
      }, { onConflict: 'telegram_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /** Update program settings */
  async updateProgramSettings(
    telegramId: number,
    settings: Partial<Pick<QuranProgram, 'evening_hour' | 'morning_hour' | 'is_active'>>
  ): Promise<void> {
    await supabase.from('quran_program').update(settings).eq('telegram_id', telegramId);
  },

  /** Schedule 4 spaced reviews for each ayah */
  async scheduleAyahReviews(
    telegramId: number,
    ayahs: { surah: number; ayah: number }[],
    week: number
  ): Promise<void> {
    const DELAYS = [1, 3, 7, 14];
    const rows: any[] = [];
    const now = new Date();

    for (const { surah, ayah } of ayahs) {
      for (let i = 0; i < 4; i++) {
        const due = new Date(now);
        due.setDate(due.getDate() + DELAYS[i]);
        rows.push({
          telegram_id: telegramId,
          surah,
          ayah,
          due_date: due.toISOString().slice(0, 10),
          review_number: i + 1,
          completed: false,
          created_at: now.toISOString(),
        });
      }
    }

    if (rows.length > 0) {
      await supabase.from('quran_reviews').insert(rows);
    }
  },

  /** Save learned ayahs to quran_progress */
  async saveLearnedAyahs(
    telegramId: number,
    ayahs: AyahData[],
    week: number
  ): Promise<void> {
    const now = new Date().toISOString();
    const rows = ayahs.map(a => ({
      telegram_id: telegramId,
      surah: a.surah,
      ayah: a.ayah,
      learned_at: now,
      review_count: 0,
      status: 'reviewing',
      week_learned: week,
      created_at: now,
    }));

    // Only insert if not already learned
    for (const row of rows) {
      const { data: existing } = await supabase
        .from('quran_progress')
        .select('id')
        .eq('telegram_id', telegramId)
        .eq('surah', row.surah)
        .eq('ayah', row.ayah)
        .single();
      if (!existing) {
        await supabase.from('quran_progress').insert(row);
      }
    }
  },

  /** Complete daily lesson */
  async completeDailyLesson(
    telegramId: number,
    ayahs: AyahData[],
    program: QuranProgram
  ): Promise<void> {
    const week = this.calcStudyWeek(program.started_at);
    const last = ayahs[ayahs.length - 1];
    const totalInSurah = await this.getSurahLength(last.surah);
    const nextSurah = last.ayah >= totalInSurah ? last.surah + 1 : last.surah;
    const nextAyah = last.ayah >= totalInSurah ? 1 : last.ayah + 1;
    const today = new Date().toISOString().slice(0, 10);

    // Save progress
    await this.saveLearnedAyahs(telegramId, ayahs, week);
    // Schedule reviews
    await this.scheduleAyahReviews(telegramId, ayahs.map(a => ({ surah: a.surah, ayah: a.ayah })), week);

    // Update program position
    await supabase.from('quran_program').update({
      current_surah: nextSurah > 114 ? 114 : nextSurah,
      current_ayah: nextSurah > 114 ? 1 : nextAyah,
      last_lesson_date: today,
      study_week: week,
    }).eq('telegram_id', telegramId);
  },

  /** Award points to user */
  async awardPoints(userId: string, points: number): Promise<void> {
    try {
      const { data: u } = await supabase.from('users').select('zikr_count').eq('id', userId).single();
      if (u) {
        await supabase.from('users').update({ zikr_count: (u.zikr_count || 0) + points }).eq('id', userId);
      }
    } catch {}
  },

  /** Get today's pending reviews */
  async getTodayReviews(telegramId: number): Promise<QuranReview[]> {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('quran_reviews')
      .select('*')
      .eq('telegram_id', telegramId)
      .eq('completed', false)
      .lte('due_date', today)
      .order('due_date');
    return data ?? [];
  },

  /** Get morning review ayahs with data (last 20 due) */
  async getMorningReviewAyahs(telegramId: number): Promise<{ review: QuranReview; ayah: AyahData }[]> {
    const reviews = await this.getTodayReviews(telegramId);
    const limited = reviews.slice(0, 20);
    const result: { review: QuranReview; ayah: AyahData }[] = [];
    for (const review of limited) {
      const ayah = await this.getAyah(review.surah, review.ayah);
      result.push({ review, ayah });
    }
    return result;
  },

  /** Get this week's ayahs for Friday review */
  async getWeekAyahs(telegramId: number, week: number): Promise<AyahData[]> {
    const { data } = await supabase
      .from('quran_progress')
      .select('*')
      .eq('telegram_id', telegramId)
      .eq('week_learned', week);

    const result: AyahData[] = [];
    for (const row of (data ?? [])) {
      const ayah = await this.getAyah(row.surah, row.ayah);
      result.push(ayah);
    }
    return result;
  },

  /** Complete a review session */
  async completeReviews(telegramId: number, reviewIds: number[]): Promise<void> {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    for (const rid of reviewIds) {
      await supabase.from('quran_reviews').update({
        completed: true,
        completed_at: now,
      }).eq('id', rid);

      // Get review info
      const { data: rev } = await supabase.from('quran_reviews').select('*').eq('id', rid).single();
      if (rev && rev.review_number >= 4) {
        // Mark as mastered
        await supabase.from('quran_progress')
          .update({ status: 'mastered', review_count: 4 })
          .eq('telegram_id', telegramId)
          .eq('surah', rev.surah)
          .eq('ayah', rev.ayah);
      } else if (rev) {
        await supabase.from('quran_progress')
          .update({ review_count: rev.review_number })
          .eq('telegram_id', telegramId)
          .eq('surah', rev.surah)
          .eq('ayah', rev.ayah);
      }
    }

    // Update last_review_date
    await supabase.from('quran_program')
      .update({ last_review_date: today })
      .eq('telegram_id', telegramId);
  },

  /** Get stats */
  async getStats(telegramId: number, program: QuranProgram): Promise<QuranStats> {
    const week = this.calcStudyWeek(program.started_at);
    const { phase } = this.getPortionConfig(week);

    const { count: learned } = await supabase
      .from('quran_progress').select('id', { count: 'exact', head: true })
      .eq('telegram_id', telegramId);

    const { count: mastered } = await supabase
      .from('quran_progress').select('id', { count: 'exact', head: true })
      .eq('telegram_id', telegramId).eq('status', 'mastered');

    const today = new Date().toISOString().slice(0, 10);
    const { count: dueTodayCount } = await supabase
      .from('quran_reviews').select('id', { count: 'exact', head: true })
      .eq('telegram_id', telegramId).eq('completed', false).lte('due_date', today);

    return {
      learned: learned ?? 0,
      mastered: mastered ?? 0,
      inReview: (learned ?? 0) - (mastered ?? 0),
      dueTodayCount: dueTodayCount ?? 0,
      week,
      phase,
    };
  },

  /** Check if lesson already done today */
  isLessonDoneToday(program: QuranProgram): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return program.last_lesson_date === today;
  },

  /** Get popular surahs for start selection */
  getPopularSurahs(): { number: number; nameRu: string; nameAr: string; ayahs: number }[] {
    return [
      { number: 114, nameRu: 'Ан-Нас', nameAr: 'الناس', ayahs: 6 },
      { number: 113, nameRu: 'Аль-Фаляк', nameAr: 'الفلق', ayahs: 5 },
      { number: 112, nameRu: 'Аль-Ихлас', nameAr: 'الإخلاص', ayahs: 4 },
      { number: 111, nameRu: 'Аль-Масад', nameAr: 'المسد', ayahs: 5 },
      { number: 110, nameRu: 'Ан-Наср', nameAr: 'النصر', ayahs: 3 },
      { number: 109, nameRu: 'Аль-Кафирун', nameAr: 'الكافرون', ayahs: 6 },
      { number: 108, nameRu: 'Аль-Каусар', nameAr: 'الكوثر', ayahs: 3 },
      { number: 107, nameRu: 'Аль-Маун', nameAr: 'الماعون', ayahs: 7 },
      { number: 106, nameRu: 'Курайш', nameAr: 'قريش', ayahs: 4 },
      { number: 105, nameRu: 'Аль-Филь', nameAr: 'الفيل', ayahs: 5 },
      { number: 78, nameRu: 'Ан-Наба', nameAr: 'النبأ', ayahs: 40 },
      { number: 67, nameRu: 'Аль-Мульк', nameAr: 'الملك', ayahs: 30 },
      { number: 55, nameRu: 'Ар-Рахман', nameAr: 'الرحمن', ayahs: 78 },
      { number: 36, nameRu: 'Ясин', nameAr: 'يس', ayahs: 83 },
      { number: 18, nameRu: 'Аль-Кахф', nameAr: 'الكهف', ayahs: 110 },
      { number: 2, nameRu: 'Аль-Бакара', nameAr: 'البقرة', ayahs: 286 },
      { number: 1, nameRu: 'Аль-Фатиха', nameAr: 'الفاتحة', ayahs: 7 },
    ];
  },
};
