import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { QuranService, AyahData, QuranReview } from '../../services/QuranService';

export default function MorningReviewScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isFridayMode = mode === 'friday';
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [items, setItems] = useState<{ review?: QuranReview; ayah: AyahData }[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [batchMode, setBatchMode] = useState(false);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const tid = await QuranService.getTelegramId(user.id);
      setTelegramId(tid);
      if (!tid) return setLoading(false);

      if (isFridayMode) {
        const prog = await QuranService.getProgram(tid);
        if (!prog) return setLoading(false);
        const week = QuranService.calcStudyWeek(prog.started_at);
        const weekAyahs = await QuranService.getWeekAyahs(tid, week);
        setItems(weekAyahs.map(a => ({ ayah: a })));
      } else {
        const reviewItems = await QuranService.getMorningReviewAyahs(tid);
        setItems(reviewItems.map(ri => ({ review: ri.review, ayah: ri.ayah })));
      }
      setLoading(false);
    };
    load();
  }, [user?.id, isFridayMode]);

  const playAudio = async (url: string, key: string) => {
    if (!url) return;
    try {
      await soundRef.current?.unloadAsync();
      setPlayingKey(key);
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded && s.didJustFinish) { setPlayingKey(null); sound.unloadAsync(); }
      });
    } catch { setPlayingKey(null); }
  };

  const stopAudio = async () => { await soundRef.current?.stopAsync(); setPlayingKey(null); };

  const markReviewed = (key: string) => {
    setReviewedIds(prev => new Set([...prev, key]));
  };

  const markAll = () => {
    const all = new Set(items.map(it => `${it.ayah.surah}:${it.ayah.ayah}`));
    setReviewedIds(all);
  };

  const handleComplete = async () => {
    if (!telegramId) return;
    setCompleting(true);
    try {
      if (!isFridayMode) {
        const ids = items
          .filter(it => it.review && reviewedIds.has(`${it.ayah.surah}:${it.ayah.ayah}`))
          .map(it => it.review!.id);
        if (ids.length > 0) {
          await QuranService.completeReviews(telegramId, ids);
        }
        const points = ids.length * 2;
        if (points > 0) await QuranService.awardPoints(user!.id, points);
        Alert.alert('Повторение завершено!', `+${points} очков начислено!`, [
          { text: 'Отлично!', onPress: () => router.back() },
        ]);
      } else {
        // Friday: just go back
        Alert.alert('Пятничное повторение завершено!', 'Так держать!', [
          { text: 'Закрыть', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Загрузка повторений...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{isFridayMode ? 'Пятничное повторение' : 'Утреннее повторение'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.green} />
          <Text style={styles.emptyText}>Нет аятов для повторения</Text>
          <Text style={styles.emptySub}>Всё повторено на сегодня!</Text>
          <TouchableOpacity style={styles.backBtnFull} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>На главную</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const allDone = reviewedIds.size === items.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stopAudio(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>
            {isFridayMode ? '🕌 Пятничное повторение' : '☀️ Утреннее повторение'}
          </Text>
          <Text style={styles.subtitle}>
            {reviewedIds.size}/{items.length} повторено · +{reviewedIds.size * 2} очков
          </Text>
        </View>
        <TouchableOpacity onPress={markAll} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Все</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(reviewedIds.size / items.length) * 100}%` as any }]} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {items.map((it, idx) => {
          const key = `${it.ayah.surah}:${it.ayah.ayah}`;
          const isPlaying = playingKey === key;
          const isDone = reviewedIds.has(key);

          return (
            <View key={key} style={[styles.ayahCard, isDone && styles.ayahCardDone]}>
              <View style={styles.ayahMeta}>
                <View style={[styles.numBadge, isDone && { backgroundColor: Colors.gold }]}>
                  <Text style={styles.numText}>{idx + 1}</Text>
                </View>
                <Text style={styles.surahRef}>{it.ayah.surahNameEn} {it.ayah.surah}:{it.ayah.ayah}</Text>
                {it.review && (
                  <View style={[styles.reviewBadge, { backgroundColor: Colors.goldBackground }]}>
                    <Text style={styles.reviewBadgeText}>Повтор {it.review.review_number}/4</Text>
                  </View>
                )}
              </View>

              <Text style={styles.arabic}>{it.ayah.arabic}</Text>
              {!!it.ayah.translit && <Text style={styles.translit}>{it.ayah.translit}</Text>}

              <View style={styles.controls}>
                <TouchableOpacity
                  style={[styles.audioBtn, isPlaying && styles.audioBtnStop]}
                  onPress={() => isPlaying ? stopAudio() : playAudio(it.ayah.audioUrl, key)}
                  testID={`play-review-${idx}`}
                >
                  <Ionicons name={isPlaying ? 'stop' : 'play'} size={16} color={isPlaying ? Colors.error : Colors.primary} />
                  <Text style={[styles.audioBtnText, isPlaying && { color: Colors.error }]}>
                    {isPlaying ? 'Стоп' : 'Слушать'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.doneBtn, isDone && styles.doneBtnDone]}
                  onPress={() => markReviewed(key)}
                  disabled={isDone}
                  testID={`mark-review-${idx}`}
                >
                  <Ionicons name={isDone ? 'checkmark-circle' : 'checkmark-circle-outline'} size={18} color={isDone ? '#FFF' : Colors.gold} />
                  <Text style={[styles.doneBtnText, isDone && { color: '#FFF' }]}>
                    {isDone ? 'Повторил' : 'Повторить'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.completeBtn, !allDone && styles.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={!allDone || completing}
          testID="complete-review-btn"
        >
          {completing ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="checkmark-done" size={20} color="#FFF" />
              <Text style={styles.completeBtnText}>
                {allDone ? `Завершить повторение (+${items.length * 2} очков)` : `Повторите все аяты (${reviewedIds.size}/${items.length})`}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 15, color: Colors.textSecondary },
  emptyText: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.textSecondary },
  backBtnFull: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 24 },
  backBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  markAllBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.goldBackground, borderRadius: 10 },
  markAllText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  progressTrack: { height: 4, backgroundColor: Colors.border },
  progressFill: { height: 4, backgroundColor: Colors.gold },
  scroll: { flex: 1, paddingHorizontal: 16 },
  ayahCard: { backgroundColor: Colors.surface, borderRadius: 18, padding: 18, marginTop: 14, borderWidth: 1.5, borderColor: Colors.border, ...Shadows.card },
  ayahCardDone: { borderColor: Colors.gold, backgroundColor: Colors.goldBackground },
  ayahMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  numBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.gold, justifyContent: 'center', alignItems: 'center' },
  numText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  surahRef: { flex: 1, fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  reviewBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reviewBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  arabic: { fontSize: 28, color: Colors.textPrimary, textAlign: 'right', lineHeight: 48, marginBottom: 10 },
  translit: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 12, fontStyle: 'italic' },
  controls: { flexDirection: 'row', gap: 8 },
  audioBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight, borderRadius: 10, paddingVertical: 9, gap: 5 },
  audioBtnStop: { backgroundColor: 'rgba(239,68,68,0.1)' },
  audioBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  doneBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.goldBackground, borderRadius: 10, paddingVertical: 9, gap: 5, borderWidth: 1.5, borderColor: Colors.gold },
  doneBtnDone: { backgroundColor: Colors.gold },
  doneBtnText: { fontSize: 13, fontWeight: '600', color: Colors.gold },
  completeBtn: { flexDirection: 'row', backgroundColor: Colors.gold, borderRadius: 14, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, ...Shadows.gold },
  completeBtnDisabled: { backgroundColor: Colors.border },
  completeBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF', flex: 1, textAlign: 'center' },
});
