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
import { CITIES } from '../../constants/cities';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

const PRAYER_LIST = [
  { key: 'fajr',    label: 'Фаджр',  icon: 'sunny-outline' as const },
  { key: 'dhuhr',   label: 'Зухр',   icon: 'sunny' as const },
  { key: 'asr',     label: 'Аср',    icon: 'partly-sunny' as const },
  { key: 'maghrib', label: 'Магриб', icon: 'cloudy-night' as const },
  { key: 'isha',    label: 'Иша',    icon: 'moon' as const },
];

type PrayerData = { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string; city: string };
type Hadith = { id: string; russian_text: string; text_ru?: string };

function getNextPrayer(times: PrayerData) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const p of PRAYER_LIST) {
    const raw = times[p.key as keyof PrayerData] as string;
    const clean = raw.split(' ')[0];
    const parts = clean.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) continue;
    const pMin = h * 60 + m;

    if (pMin > nowMin) {
      const diff = pMin - nowMin;
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      const timeLeft = hours > 0
        ? (mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`)
        : `${mins}м`;
      return { ...p, time: clean, timeLeft };
    }
  }
  // After Isha — next Fajr
  const fajrClean = times.fajr.split(' ')[0];
  const [fh, fm] = fajrClean.split(':').map(Number);
  const fajrMin = fh * 60 + fm;
  const nowMin2 = now.getHours() * 60 + now.getMinutes();
  const minutesUntilMidnight = 24 * 60 - nowMin2;
  const totalDiff = minutesUntilMidnight + fajrMin;
  const hours = Math.floor(totalDiff / 60);
  const mins = totalDiff % 60;
  return { ...PRAYER_LIST[0], time: fajrClean, timeLeft: `${hours}ч ${mins}м` };
}

function getWeekDayDate() {
  return new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, selectedCity } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState<PrayerData | null>(null);
  const [nextPrayer, setNextPrayer] = useState<ReturnType<typeof getNextPrayer> | null>(null);
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [hadithLoading, setHadithLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const citySlug = CITIES.find(c => c.label === selectedCity)?.slug || 'moscow';
    try {
      const [prayerRes, hadithRes, lbRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/prayer-times?city=${citySlug}`),
        fetch(`${API_URL}/api/hadith/daily`),
        fetch(`${API_URL}/api/leaderboard?limit=3`),
      ]);
      if (prayerRes.status === 'fulfilled' && prayerRes.value.ok) {
        const d = await prayerRes.value.json();
        setPrayerTimes(d);
        setNextPrayer(getNextPrayer(d));
      }
      if (hadithRes.status === 'fulfilled' && hadithRes.value.ok) {
        const d = await hadithRes.value.json();
        setHadith(d.russian_text || d.text_ru ? d : null);
      }
      if (lbRes.status === 'fulfilled' && lbRes.value.ok) {
        const d = await lbRes.value.json();
        setLeaderboard(d.leaderboard || []);
      }
    } catch (_) {}
    finally { setHadithLoading(false); }
  }, [selectedCity]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const rankEmoji = ['🥇', '🥈', '🥉'];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Ас-саляму алейкум,</Text>
            <Text style={styles.name}>{user?.display_name || 'Брат'}</Text>
            <Text style={styles.dateText}>{getWeekDayDate()}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/search')} testID="header-search-btn">
              <Ionicons name="search" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/profile')} testID="header-profile-btn">
              <Ionicons name="person" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Prayer Card */}
        <View style={styles.prayerCard}>
          {nextPrayer ? (
            <>
              <View style={styles.prayerNextRow}>
                <View>
                  <Text style={styles.prayerNextLabel}>Следующий намаз</Text>
                  <Text style={styles.prayerNextName}>{nextPrayer.label}</Text>
                  <Text style={styles.prayerNextTime}>{nextPrayer.time}</Text>
                </View>
                <View style={styles.prayerTimeBadge}>
                  <Ionicons name="time-outline" size={14} color="#fff" />
                  <Text style={styles.prayerTimeBadgeText}>через {nextPrayer.timeLeft}</Text>
                </View>
              </View>
              <View style={styles.prayerDivider} />
              {prayerTimes && (
                <View style={styles.prayerList}>
                  {PRAYER_LIST.map(p => {
                    const isNext = p.key === nextPrayer.key;
                    const raw = prayerTimes[p.key as keyof PrayerData] as string;
                    const t = raw.split(' ')[0];
                    return (
                      <View key={p.key} style={[styles.prayerItem, isNext && styles.prayerItemActive]}>
                        <Ionicons name={p.icon} size={13} color={isNext ? Colors.primary : 'rgba(255,255,255,0.6)'} />
                        <Text style={[styles.prayerItemLabel, isNext && styles.prayerItemLabelActive]}>{p.label}</Text>
                        <Text style={[styles.prayerItemTime, isNext && styles.prayerItemTimeActive]}>{t}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <View style={styles.prayerLoading}>
              <ActivityIndicator color="rgba(255,255,255,0.7)" />
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'radio-button-on', label: 'Зикр',     route: '/(tabs)/zikr',    testID: 'qa-zikr' },
            { icon: 'book',            label: 'Хифз',     route: '/(tabs)/quran',   testID: 'qa-hifz' },
            { icon: 'chatbubbles',     label: 'Спросить', route: '/(tabs)/qa',      testID: 'qa-ask'  },
            { icon: 'library',         label: 'Хадисы',   route: '/(tabs)/hadiths', testID: 'qa-hadiths' },
          ].map(item => (
            <TouchableOpacity
              key={item.testID}
              style={styles.actionCard}
              onPress={() => router.push(item.route as any)}
              testID={item.testID}
            >
              <View style={styles.actionIconWrap}>
                <Ionicons name={item.icon as any} size={30} color={Colors.primary} />
              </View>
              <Text style={styles.actionText} numberOfLines={1}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hadith of the Day */}
        {!hadithLoading && hadith && (
          <View style={styles.hadithCard}>
            <Text style={styles.hadithTitle}>ХАДИС ДНЯ</Text>
            <View style={styles.hadithDivider} />
            <ScrollView style={styles.hadithScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <Text style={styles.hadithText}>{hadith.russian_text || hadith.text_ru}</Text>
            </ScrollView>
          </View>
        )}

        {/* Continue Learning */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Обучение</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/lessons')}>
              <Text style={styles.sectionLink}>Все курсы</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.courseCard} onPress={() => router.push('/(tabs)/lessons')} testID="course-btn">
            <View style={styles.courseContent}>
              <Text style={styles.courseEmoji}>📘</Text>
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle}>Шафиитский мазхаб</Text>
                <Text style={styles.courseProgress}>Продолжить обучение</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Leaderboard Preview */}
        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Рейтинг</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/rating')}>
                <Text style={styles.sectionLink}>Полный список</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.leaderboardCard}>
              {leaderboard.slice(0, 3).map((u: any, i: number) => (
                <View key={u.user_id} style={[styles.leaderboardItem, i < 2 && styles.leaderboardBorder]}>
                  <Text style={styles.leaderboardRank}>{rankEmoji[i]}</Text>
                  <Text style={styles.leaderboardName}>{u.name || 'Студент'}</Text>
                  <Text style={styles.leaderboardPoints}>{u.points}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  header: { paddingTop: 20, paddingHorizontal: 20, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft:  { flex: 1 },
  greeting:    { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  name:        { fontSize: 32, fontWeight: '800', color: Colors.textPrimary, marginTop: 2, letterSpacing: -0.5 },
  dateText:    { fontSize: 13, color: Colors.textTertiary, marginTop: 3, fontWeight: '400', textTransform: 'capitalize' },
  headerRight: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', ...Shadows.card },
  prayerCard: { backgroundColor: Colors.primary, borderRadius: 24, padding: 20, marginHorizontal: 20, marginBottom: 24, ...Shadows.hero },
  prayerLoading:    { paddingVertical: 30, alignItems: 'center' },
  prayerNextRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  prayerNextLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 4 },
  prayerNextName:   { fontSize: 28, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 2 },
  prayerNextTime:   { fontSize: 42, fontWeight: '300', color: '#FFF', letterSpacing: -2 },
  prayerTimeBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  prayerTimeBadgeText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  prayerDivider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 14 },
  prayerList:       { flexDirection: 'row', justifyContent: 'space-between' },
  prayerItem:       { alignItems: 'center', flex: 1, gap: 3, paddingVertical: 7, borderRadius: 10 },
  prayerItemActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  prayerItemLabel:  { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  prayerItemLabelActive: { color: '#FFF' },
  prayerItemTime:   { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  prayerItemTimeActive:  { color: '#FFF' },
  quickActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  actionCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 18, paddingVertical: 18, alignItems: 'center', ...Shadows.card },
  actionIconWrap: { marginBottom: 10 },
  actionText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  hadithCard: { backgroundColor: Colors.greenBackground, borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 24, borderLeftWidth: 3, borderLeftColor: Colors.green, ...Shadows.card },
  hadithTitle: { fontSize: 11, fontWeight: '800', color: Colors.green, letterSpacing: 1.5, marginBottom: 10 },
  hadithDivider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  hadithScroll:  { maxHeight: 160 },
  hadithText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 26, fontStyle: 'italic', backgroundColor: 'transparent' },
  section:       { marginBottom: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sectionLink:   { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  courseCard: { backgroundColor: Colors.surface, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Shadows.card },
  courseContent:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  courseEmoji:    { fontSize: 32, marginRight: 14 },
  courseInfo:     { flex: 1 },
  courseTitle:    { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  courseProgress: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  leaderboardCard:  { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, ...Shadows.card },
  leaderboardItem:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  leaderboardBorder:{ borderBottomWidth: 1, borderBottomColor: Colors.border },
  leaderboardRank:  { fontSize: 22 },
  leaderboardName:  { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  leaderboardPoints:{ fontSize: 15, fontWeight: '800', color: Colors.primary },
});
