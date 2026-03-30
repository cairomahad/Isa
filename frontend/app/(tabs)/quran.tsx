import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { QuranService, QuranProgram, QuranStats } from '../../services/QuranService';

export default function QuranScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [program, setProgram] = useState<QuranProgram | null>(null);
  const [stats, setStats] = useState<QuranStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasOverdue, setHasOverdue] = useState(false);
  const [isFriday, setIsFriday] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const tid = await QuranService.getTelegramId(user.id);
      setTelegramId(tid);
      if (!tid) { setLoading(false); return; }

      const prog = await QuranService.getProgram(tid);
      setProgram(prog);
      setIsFriday(QuranService.isFriday());

      if (prog) {
        const [st, overdue] = await Promise.all([
          QuranService.getStats(tid, prog),
          QuranService.hasOverdueReviews(tid),
        ]);
        setStats(st);
        setHasOverdue(overdue);
      }
    } catch (e) {
      console.warn('QuranScreen load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // No program yet
  if (!program) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.centerScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>
          <Text style={styles.welcomeTitle}>Программа хифза Корана</Text>
          <Text style={styles.welcomeDesc}>
            Система интервального повторения:{'\n'}
            выучи аят — повтори через 1, 3, 7 и 14 дней.{'\n'}
            Прогрессивная нагрузка по неделям.
          </Text>

          <View style={styles.phaseCards}>
            {[
              { emoji: '🌱', label: 'Недели 1–4', desc: '1–2 аята в день', sub: 'Разминка' },
              { emoji: '📈', label: 'Недели 5–8', desc: '~5 аятов в день', sub: 'Нагрузка' },
              { emoji: '🏔️', label: 'Недели 9–12', desc: '~10 аятов в день', sub: 'Плато' },
            ].map((p, i) => (
              <View key={i} style={styles.phaseCard}>
                <Text style={styles.phaseEmoji}>{p.emoji}</Text>
                <Text style={styles.phaseSub}>{p.sub}</Text>
                <Text style={styles.phaseLabel}>{p.label}</Text>
                <Text style={styles.phaseDesc}>{p.desc}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push('/quran/settings')}
            testID="start-quran-btn"
          >
            <Ionicons name="book" size={20} color="#FFFFFF" />
            <Text style={styles.startBtnText}>Начать программу</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const week = stats?.week ?? 1;
  const lessonDoneToday = QuranService.isLessonDoneToday(program);
  const canDoLesson = !hasOverdue && !isFriday && !lessonDoneToday;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Хифз Корана</Text>
            <Text style={styles.subtitle}>Неделя {week} · {stats?.phase}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/quran/progress')} testID="quran-progress-btn">
              <Ionicons name="bar-chart" size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/quran/settings')} testID="quran-settings-btn">
              <Ionicons name="settings-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Warning: overdue */}
        {hasOverdue && (
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={20} color={Colors.error} />
            <Text style={styles.warningText}>
              Есть незавершённые повторения! Сначала повторите, потом новый урок.
            </Text>
          </View>
        )}

        {/* Friday notice */}
        {isFriday && !hasOverdue && (
          <View style={styles.fridayCard}>
            <Text style={styles.fridayEmoji}>🕌</Text>
            <Text style={styles.fridayText}>Пятница — день повторения всей недели</Text>
          </View>
        )}

        {/* Stats row */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{stats.learned}</Text>
              <Text style={styles.statLabel}>Выучено</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: Colors.green }]}>{stats.mastered}</Text>
              <Text style={styles.statLabel}>Освоено</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNum, { color: stats.dueTodayCount > 0 ? Colors.error : Colors.textPrimary }]}>
                {stats.dueTodayCount}
              </Text>
              <Text style={styles.statLabel}>Сегодня повтор</Text>
            </View>
          </View>
        )}

        {/* Current position */}
        <View style={styles.posCard}>
          <Ionicons name="location" size={18} color={Colors.primary} />
          <Text style={styles.posText}>
            Сура {program.current_surah}, аят {program.current_ayah}
          </Text>
        </View>

        {/* Action cards */}
        <View style={styles.actionRow}>
          {/* Evening lesson */}
          <TouchableOpacity
            style={[styles.actionCard, !canDoLesson && styles.actionCardDisabled]}
            onPress={() => canDoLesson && router.push('/quran/lesson')}
            disabled={!canDoLesson}
            testID="evening-lesson-btn"
          >
            <Ionicons name="moon" size={32} color={canDoLesson ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.actionTitle, !canDoLesson && { color: Colors.textSecondary }]}>
              Вечерний урок
            </Text>
            <Text style={styles.actionSub}>
              {lessonDoneToday ? 'Готово сегодня ✓' :
               hasOverdue ? 'Сначала повтор' :
               isFriday ? 'Пятница' :
               `${QuranService.getPortionConfig(week).maxAyahs} аятов`}
            </Text>
          </TouchableOpacity>

          {/* Morning review */}
          <TouchableOpacity
            style={[styles.actionCard, stats?.dueTodayCount === 0 && styles.actionCardDisabled]}
            onPress={() => stats && stats.dueTodayCount > 0 && router.push('/quran/review')}
            disabled={(stats?.dueTodayCount ?? 0) === 0}
            testID="morning-review-btn"
          >
            <Ionicons name="sunny" size={32} color={(stats?.dueTodayCount ?? 0) > 0 ? Colors.gold : Colors.textSecondary} />
            <Text style={[styles.actionTitle, (stats?.dueTodayCount ?? 0) === 0 && { color: Colors.textSecondary }]}>
              Утреннее повторение
            </Text>
            <Text style={styles.actionSub}>
              {(stats?.dueTodayCount ?? 0) > 0 ? `${stats?.dueTodayCount} аятов` : 'Всё повторено'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Friday full review */}
        {isFriday && (
          <TouchableOpacity
            style={styles.fridayBtn}
            onPress={() => router.push('/quran/review?mode=friday')}
          >
            <Ionicons name="refresh-circle" size={24} color="#FFFFFF" />
            <Text style={styles.fridayBtnText}>Пятничное повторение (неделя {week})</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingBottom: 60 },
  scroll: { flex: 1 },
  // Welcome
  bismillah: { fontSize: 26, color: Colors.primary, textAlign: 'center', marginBottom: 24, fontWeight: '600' },
  welcomeTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 12 },
  welcomeDesc: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  phaseCards: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  phaseCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 14, alignItems: 'center', ...Shadows.card },
  phaseEmoji: { fontSize: 28, marginBottom: 4 },
  phaseSub: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  phaseLabel: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4, textAlign: 'center' },
  phaseDesc: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  startBtn: { flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 30, paddingHorizontal: 32, paddingVertical: 16, alignItems: 'center', gap: 10, ...Shadows.gold },
  startBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  // Active
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', ...Shadows.card },
  warningCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, margin: 20, marginTop: 0, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.error },
  warningText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '600' },
  fridayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.greenBackground, borderRadius: 12, margin: 20, marginTop: 0, padding: 14, gap: 10, borderLeftWidth: 3, borderLeftColor: Colors.green },
  fridayEmoji: { fontSize: 22 },
  fridayText: { fontSize: 14, color: Colors.green, fontWeight: '600' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', ...Shadows.card },
  statNum: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, textAlign: 'center', fontWeight: '600' },
  posCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 20, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, gap: 8, ...Shadows.card },
  posText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  actionCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 20, padding: 20, alignItems: 'center', gap: 8, ...Shadows.card },
  actionCardDisabled: { opacity: 0.5 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  actionSub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  fridayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.green, borderRadius: 14, marginHorizontal: 20, padding: 16, gap: 10 },
  fridayBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
