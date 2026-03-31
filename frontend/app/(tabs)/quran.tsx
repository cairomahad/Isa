import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { HifzService, HifzProgram } from '../../services/QuranHifzService';

export default function QuranScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [program, setProgram] = useState<HifzProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sqlNeeded, setSqlNeeded] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const resp = await HifzService.getProgram(user.id);
      if ((resp as any).sql_needed) {
        setSqlNeeded(true);
        setProgram(null);
      } else {
        setSqlNeeded(false);
        setProgram(resp.active && resp.program ? resp.program : null);
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Экран: SQL нужен ──
  if (sqlNeeded) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.startContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={[styles.startTitle, { fontSize: 22, color: Colors.error }]}>Требуется настройка</Text>
          <Text style={[styles.startLine, { textAlign: 'center' }]}>
            Необходимо создать таблицы в Supabase.{'\n'}
            Откройте файл{'\n'}
            <Text style={{ fontWeight: '700', color: Colors.primary }}>/app/HIFZ_SQL.sql</Text>{'\n'}
            и выполните его в Supabase SQL Editor.
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => { setLoading(true); load(); }}>
            <Ionicons name="refresh" size={20} color="#FFF" />
            <Text style={styles.startBtnText}>Проверить снова</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Экран 1: Нет программы ──
  if (!program) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.startContainer}>
          <Text style={styles.startIcon}>بِسْمِ اللَّهِ</Text>
          <Text style={styles.startTitle}>Хифз Корана</Text>
          <View style={styles.startLines}>
            <Text style={styles.startLine}>Учи 2 аята в день.</Text>
            <Text style={styles.startLine}>Повторяй каждое утро.</Text>
            <Text style={styles.startLine}>Завершай суру за сурой.</Text>
          </View>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push('/quran/surah-selector')}
            testID="choose-surah-btn"
          >
            <Ionicons name="book" size={20} color="#FFF" />
            <Text style={styles.startBtnText}>Выбрать суру</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Экран 3: Дашборд ──
  const lessonDone = HifzService.isLessonDoneToday(program);
  const reviewDone = HifzService.isReviewDoneToday(program);

  const progressWidth = `${Math.min(100, program.progress_pct)}%` as any;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Хифз Корана</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/quran/progress')}
            testID="quran-stats-btn"
          >
            <Ionicons name="bar-chart" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Surah info card */}
        <View style={styles.surahCard}>
          <View style={styles.surahTop}>
            <Text style={styles.surahNum}>{program.current_surah}.</Text>
            <View style={styles.surahNames}>
              <Text style={styles.surahName}>{program.surah_name}</Text>
              <Text style={styles.surahNameRu}>{program.surah_name_ru}</Text>
            </View>
            <Text style={styles.surahAr}>{program.surah_name_ar}</Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>
                Выучено: {program.learned_count} из {program.total_ayahs} аятов
              </Text>
              <Text style={styles.progressPct}>{program.progress_pct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionCard, lessonDone && styles.actionDone]}
            onPress={() => !lessonDone && router.push('/quran/lesson')}
            disabled={lessonDone}
            testID="evening-lesson-btn"
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="moon" size={28} color={lessonDone ? Colors.textSecondary : Colors.primary} />
            </View>
            <Text style={[styles.actionTitle, lessonDone && styles.actionTitleDone]}>
              Вечерний урок
            </Text>
            <Text style={styles.actionSub}>
              {lessonDone ? 'Выполнен сегодня ✓' : '2 новых аята'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, reviewDone && styles.actionDone]}
            onPress={() => !reviewDone && program.learned_count > 0 && router.push('/quran/review')}
            disabled={reviewDone || program.learned_count === 0}
            testID="morning-review-btn"
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="sunny" size={28} color={(reviewDone || program.learned_count === 0) ? Colors.textSecondary : Colors.gold} />
            </View>
            <Text style={[styles.actionTitle, (reviewDone || program.learned_count === 0) && styles.actionTitleDone]}>
              Утреннее повторение
            </Text>
            <Text style={styles.actionSub}>
              {program.learned_count === 0 ? 'Нет аятов' : reviewDone ? 'Выполнено сегодня ✓' : `${program.learned_count} аятов`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Settings info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="moon-outline" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>Вечерний урок: {program.evening_hour}:00</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="sunny-outline" size={16} color={Colors.gold} />
            <Text style={styles.infoText}>Утреннее повторение: {program.morning_hour}:00</Text>
          </View>

          <TouchableOpacity
            style={styles.changeSurahBtn}
            onPress={() => router.push('/quran/surah-selector')}
            testID="change-surah-btn"
          >
            <Ionicons name="refresh" size={16} color={Colors.primary} />
            <Text style={styles.changeSurahText}>Сменить суру</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Start screen
  startContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  startIcon: { fontSize: 32, color: Colors.primary, marginBottom: 20, fontWeight: '600' },
  startTitle: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary, marginBottom: 28, letterSpacing: -0.5 },
  startLines: { gap: 6, marginBottom: 48, alignItems: 'center' },
  startLine: { fontSize: 17, color: Colors.textSecondary, lineHeight: 28 },
  startBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 30,
    paddingHorizontal: 36, paddingVertical: 16, alignItems: 'center', gap: 10, ...Shadows.gold,
  },
  startBtnText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  // Dashboard
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center', ...Shadows.card,
  },
  surahCard: {
    margin: 20, marginBottom: 14, backgroundColor: Colors.surface,
    borderRadius: 20, padding: 20, ...Shadows.card,
  },
  surahTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  surahNum: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  surahNames: { flex: 1 },
  surahName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  surahNameRu: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  surahAr: { fontSize: 22, color: Colors.primary, fontWeight: '600' },
  progressSection: { gap: 8 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  progressPct: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  progressTrack: { height: 8, backgroundColor: Colors.border, borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 14 },
  actionCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 20, padding: 18,
    alignItems: 'center', gap: 8, ...Shadows.card, borderWidth: 1.5, borderColor: 'transparent',
  },
  actionDone: { opacity: 0.55 },
  actionIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.backgroundPage, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  actionTitleDone: { color: Colors.textSecondary },
  actionSub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },
  infoCard: {
    marginHorizontal: 20, backgroundColor: Colors.surface, borderRadius: 16,
    padding: 16, gap: 10, ...Shadows.card,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  changeSurahBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  changeSurahText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
