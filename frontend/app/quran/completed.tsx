import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { HifzService } from '../../services/QuranHifzService';

export default function SurahCompletedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surah: string; name: string }>();
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const surahNum = parseInt(params.surah || '1');
  const surahName = params.name || '';

  useEffect(() => {
    if (!user?.id) return;
    HifzService.getStats(user.id).then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, [user?.id]);

  const nextSurah = surahNum < 114 ? surahNum + 1 : null;

  const handleNext = async () => {
    if (!user?.id || !nextSurah) return;
    await HifzService.startProgram(user.id, nextSurah);
    router.replace('/(tabs)/quran');
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={Colors.primary} /></View></SafeAreaView>;
  }

  const daysLearned = stats?.started_at
    ? Math.floor((Date.now() - new Date(stats.started_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="star" size={48} color={Colors.gold} />
        </View>

        <Text style={styles.maasha}>Ма ша Аллах!</Text>
        <Text style={styles.completed}>Вы завершили суру</Text>
        <Text style={styles.surahName}>{surahName}</Text>

        {/* Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Статистика</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{daysLearned}</Text>
              <Text style={styles.statLabel}>Дней изучения</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{stats?.total_ayahs || 0}</Text>
              <Text style={styles.statLabel}>Выучено аятов</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{stats?.points || 0}</Text>
              <Text style={styles.statLabel}>Очков</Text>
            </View>
          </View>
          <Text style={styles.note}>
            Аяты этой суры теперь повторяете самостоятельно
          </Text>
        </View>

        {/* Buttons */}
        {nextSurah && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} testID="next-surah-btn">
            <Ionicons name="play" size={18} color="#FFF" />
            <Text style={styles.nextBtnText}>Следующая: {nextSurah}. Сура</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.chooseSurahBtn}
          onPress={() => router.push('/quran/surah-selector')}
          testID="choose-other-surah-btn"
        >
          <Ionicons name="book" size={18} color={Colors.primary} />
          <Text style={styles.chooseSurahText}>Выбрать другую суру</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.goldBackground,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  maasha: { fontSize: 28, fontWeight: '800', color: Colors.primary, marginBottom: 8 },
  completed: { fontSize: 17, color: Colors.textSecondary, marginBottom: 4 },
  surahName: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 28 },
  statsCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 20, width: '100%',
    marginBottom: 24, ...Shadows.card,
  },
  statsTitle: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  note: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', fontStyle: 'italic' },
  nextBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 16, alignItems: 'center', gap: 8,
    width: '100%', justifyContent: 'center', marginBottom: 12, ...Shadows.gold,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  chooseSurahBtn: {
    flexDirection: 'row', borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, alignItems: 'center', gap: 8,
    width: '100%', justifyContent: 'center',
  },
  chooseSurahText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
});
