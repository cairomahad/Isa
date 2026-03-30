import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { QuranService, QuranStats, QuranProgram } from '../../services/QuranService';

export default function QuranProgressScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [program, setProgram] = useState<QuranProgram | null>(null);
  const [stats, setStats] = useState<QuranStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const tid = await QuranService.getTelegramId(user.id);
      setTelegramId(tid);
      if (!tid) return setLoading(false);
      const prog = await QuranService.getProgram(tid);
      setProgram(prog);
      if (prog) {
        const st = await QuranService.getStats(tid, prog);
        setStats(st);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={Colors.primary} /></View></SafeAreaView>;
  }

  if (!program) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Прогресс хифза</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Программа не начата</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/quran/settings')}>
            <Text style={styles.startBtnText}>Начать программу</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const week = stats?.week ?? 1;
  const startedDate = new Date(program.started_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const progressPct = stats ? Math.round((stats.mastered / Math.max(stats.learned, 1)) * 100) : 0;

  // Phase timeline
  const phases = [
    { weeks: '1–4', label: 'Разминка', emoji: '🌱', maxAyahs: 2, active: week <= 4 },
    { weeks: '5–8', label: 'Нагрузка', emoji: '📈', maxAyahs: 5, active: week >= 5 && week <= 8 },
    { weeks: '9–12', label: 'Плато', emoji: '🏔️', maxAyahs: 10, active: week >= 9 },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Прогресс хифза</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroWeek}>Неделя {week}</Text>
          <Text style={styles.heroPhase}>{stats?.phase}</Text>
          <Text style={styles.heroStarted}>Начато: {startedDate}</Text>
          {!program.is_active && (
            <View style={styles.pauseBadge}>
              <Ionicons name="pause-circle" size={14} color={Colors.error} />
              <Text style={styles.pauseText}>На паузе</Text>
            </View>
          )}
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="book" size={24} color={Colors.primary} />
            <Text style={styles.statNum}>{stats?.learned ?? 0}</Text>
            <Text style={styles.statLabel}>Выучено аятов</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-done-circle" size={24} color={Colors.green} />
            <Text style={[styles.statNum, { color: Colors.green }]}>{stats?.mastered ?? 0}</Text>
            <Text style={styles.statLabel}>Освоено</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="refresh-circle" size={24} color={Colors.gold} />
            <Text style={[styles.statNum, { color: Colors.gold }]}>{stats?.inReview ?? 0}</Text>
            <Text style={styles.statLabel}>В повторении</Text>
          </View>
          <View style={[styles.statCard, (stats?.dueTodayCount ?? 0) > 0 && styles.statCardAlert]}>
            <Ionicons name="today" size={24} color={(stats?.dueTodayCount ?? 0) > 0 ? Colors.error : Colors.textSecondary} />
            <Text style={[styles.statNum, (stats?.dueTodayCount ?? 0) > 0 && { color: Colors.error }]}>
              {stats?.dueTodayCount ?? 0}
            </Text>
            <Text style={styles.statLabel}>Сегодня повтор</Text>
          </View>
        </View>

        {/* Mastery progress */}
        {(stats?.learned ?? 0) > 0 && (
          <View style={styles.masteryCard}>
            <View style={styles.masteryHeader}>
              <Text style={styles.masteryTitle}>Прогресс освоения</Text>
              <Text style={styles.masteryPct}>{progressPct}%</Text>
            </View>
            <View style={styles.masteryBar}>
              <View style={[styles.masteryFill, { width: `${progressPct}%` as any }]} />
            </View>
            <Text style={styles.masteryDesc}>
              {stats?.mastered} из {stats?.learned} аятов полностью освоено (4 повторения)
            </Text>
          </View>
        )}

        {/* Current position */}
        <View style={styles.posCard}>
          <Ionicons name="location" size={18} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.posTitle}>Текущая позиция</Text>
            <Text style={styles.posValue}>Сура {program.current_surah}, аят {program.current_ayah}</Text>
          </View>
          <Text style={styles.posMax}>
            ~{QuranService.getPortionConfig(week).maxAyahs} аятов/день
          </Text>
        </View>

        {/* Phase timeline */}
        <Text style={styles.sectionTitle}>Фазы программы (12 недель)</Text>
        <View style={styles.timeline}>
          {phases.map((ph, i) => (
            <View key={i} style={[styles.timelineItem, ph.active && styles.timelineItemActive]}>
              <Text style={styles.timelineEmoji}>{ph.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.timelineLabel, ph.active && { color: Colors.primary }]}>{ph.label}</Text>
                <Text style={styles.timelineWeeks}>Недели {ph.weeks} · {ph.maxAyahs} аят./день</Text>
              </View>
              {ph.active && (
                <View style={styles.activeDot}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Spaced repetition info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Интервальные повторения</Text>
          {[[1, 'день', '💫'], [3, 'дня', '⭐'], [7, 'дней', '🌟'], [14, 'дней', '✨']].map(([days, unit, emoji], i) => (
            <View key={i} style={styles.infoRow}>
              <Text style={styles.infoEmoji}>{emoji}</Text>
              <Text style={styles.infoText}>Повтор {i + 1}: через {days} {unit}</Text>
            </View>
          ))}
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>🏆</Text>
            <Text style={styles.infoText}>После 4-го повторения — статус "Освоено"</Text>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  emptyText: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary },
  startBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  scroll: { flex: 1, paddingHorizontal: 16 },
  heroCard: { backgroundColor: Colors.primary, borderRadius: 20, padding: 24, marginTop: 20, alignItems: 'center', ...Shadows.hero },
  heroWeek: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 4 },
  heroPhase: { fontSize: 28, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  heroStarted: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  pauseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  pauseText: { fontSize: 12, color: Colors.error, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, ...Shadows.card },
  statCardAlert: { borderWidth: 1.5, borderColor: Colors.error },
  statNum: { fontSize: 28, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  masteryCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginTop: 16, ...Shadows.card },
  masteryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  masteryTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  masteryPct: { fontSize: 15, fontWeight: '700', color: Colors.green },
  masteryBar: { height: 10, backgroundColor: Colors.border, borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  masteryFill: { height: 10, backgroundColor: Colors.green, borderRadius: 5 },
  masteryDesc: { fontSize: 12, color: Colors.textSecondary },
  posCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginTop: 12, gap: 10, ...Shadows.card },
  posTitle: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  posValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  posMax: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 24, marginBottom: 12 },
  timeline: { gap: 8 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1.5, borderColor: Colors.border },
  timelineItemActive: { borderColor: Colors.primary, backgroundColor: Colors.goldBackground },
  timelineEmoji: { fontSize: 24 },
  timelineLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  timelineWeeks: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  activeDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  infoCard: { backgroundColor: Colors.greenBackground, borderRadius: 16, padding: 16, marginTop: 16, borderLeftWidth: 3, borderLeftColor: Colors.green },
  infoTitle: { fontSize: 14, fontWeight: '700', color: Colors.green, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  infoEmoji: { fontSize: 18 },
  infoText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
});
