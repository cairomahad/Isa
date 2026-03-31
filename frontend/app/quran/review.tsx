import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { HifzService, HifzReview, HifzAyahData, HifzAyahRef } from '../../services/QuranHifzService';

type AyahItem = HifzAyahRef & { arabic_text?: string; transliteration?: string };

export default function MorningReviewScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [review, setReview] = useState<HifzReview | null>(null);
  const [allAyahs, setAllAyahs] = useState<AyahItem[]>([]);
  const [yesterdayAyahs, setYesterdayAyahs] = useState<AyahItem[]>([]);
  const [blockAyahs, setBlockAyahs] = useState<AyahItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const r = await HifzService.getReview(user.id);
        setReview(r);

        const fetchText = async (ayahs: HifzAyahRef[]): Promise<AyahItem[]> => {
          return Promise.all(ayahs.map(a =>
            HifzService.getAyahText(a.surah, a.ayah, a.audio_url).then(d => ({
              ...a, arabic_text: d.arabic_text, transliteration: d.transliteration,
            }))
          ));
        };

        if (r.mode === 'panel_a') {
          setAllAyahs(await fetchText(r.all_ayahs));
        } else {
          const [yest, block] = await Promise.all([
            fetchText(r.yesterday_ayahs),
            r.current_block ? fetchText(r.current_block.ayahs) : Promise.resolve([]),
          ]);
          setYesterdayAyahs(yest);
          setBlockAyahs(block);
        }
      } catch (e: any) {
        Alert.alert('Ошибка', e.message || 'Не удалось загрузить', [{ text: 'Назад', onPress: () => router.back() }]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const playAudio = async (url: string, key: string) => {
    try {
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingKey(key);
      sound.setOnPlaybackStatusUpdate(s => {
        if (s.isLoaded && s.didJustFinish) { setPlayingKey(null); sound.unloadAsync(); }
      });
    } catch { setPlayingKey(null); }
  };

  const stopAudio = async () => { await soundRef.current?.stopAsync(); setPlayingKey(null); };

  const playSequentially = async (ayahs: AyahItem[]) => {
    for (const a of ayahs) {
      const key = `${a.surah}:${a.ayah}`;
      setPlayingKey(key);
      try {
        await soundRef.current?.unloadAsync();
        const { sound } = await Audio.Sound.createAsync({ uri: a.audio_url }, { shouldPlay: true });
        soundRef.current = sound;
        await new Promise<void>(resolve => {
          sound.setOnPlaybackStatusUpdate(s => {
            if (s.isLoaded && s.didJustFinish) { sound.unloadAsync(); resolve(); }
          });
        });
      } catch { break; }
    }
    setPlayingKey(null);
  };

  const handleComplete = async () => {
    if (!user?.id) return;
    setCompleting(true);
    try {
      const { points_earned } = await HifzService.completeReview(user.id);
      await soundRef.current?.unloadAsync();
      Alert.alert('Повторение завершено!', `+${points_earned} очков начислено!`, [
        { text: 'Отлично!', onPress: () => router.back() },
      ]);
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

  if (!review || (review.mode === 'panel_a' && allAyahs.length === 0)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Утреннее повторение</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.green} />
          <Text style={styles.emptyTitle}>Нет аятов для повторения</Text>
          <Text style={styles.emptySub}>Сначала выучите аяты на вечернем уроке</Text>
          <TouchableOpacity style={styles.backBtnFull} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>На главную</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderAyahRow = (ayah: AyahItem, idx: number) => {
    const key = `${ayah.surah}:${ayah.ayah}`;
    const isPlaying = playingKey === key;
    return (
      <View key={key} style={styles.ayahRow}>
        <Text style={styles.ayahRef}>{ayah.surah}:{ayah.ayah}</Text>
        <View style={styles.ayahContent}>
          <Text style={styles.arabic}>{ayah.arabic_text || '...'}</Text>
          {!!ayah.transliteration && <Text style={styles.translit}>{ayah.transliteration}</Text>}
        </View>
      </View>
    );
  };

  // ── Panel A ──
  if (review.mode === 'panel_a') {
    const isAnyPlaying = playingKey !== null;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { stopAudio(); router.back(); }} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Утреннее повторение</Text>
            <Text style={styles.subtitle}>Все выученные аяты ({allAyahs.length})</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Play all */}
          <TouchableOpacity
            style={[styles.playAllBtn, isAnyPlaying && styles.playAllBtnActive]}
            onPress={() => isAnyPlaying ? stopAudio() : playSequentially(allAyahs)}
            testID="play-all-btn"
          >
            <Ionicons name={isAnyPlaying ? 'stop-circle' : 'play-circle'} size={24} color="#FFF" />
            <Text style={styles.playAllText}>
              {isAnyPlaying ? 'Остановить' : 'Слушать все аяты подряд'}
            </Text>
          </TouchableOpacity>

          {/* All ayahs */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Все выученные аяты</Text>
            {allAyahs.map((a, i) => renderAyahRow(a, i))}
          </View>

          {/* Complete */}
          <TouchableOpacity
            style={[styles.completeBtn, completing && styles.completeBtnDisabled]}
            onPress={handleComplete}
            disabled={completing}
            testID="complete-review-btn"
          >
            {completing ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="checkmark-done" size={22} color="#FFF" />
                <Text style={styles.completeBtnText}>Повторил все аяты  →  +5 очков</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Panel B ──
  const isAnyPlaying = playingKey !== null;
  const blockInfo = review.current_block;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stopAudio(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Утреннее повторение</Text>
          <Text style={styles.subtitle}>
            {yesterdayAyahs.length} вчера + {blockAyahs.length} из блока
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Yesterday section */}
        {yesterdayAyahs.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Вчерашние аяты ({yesterdayAyahs.length} новых)</Text>
              <TouchableOpacity
                style={styles.sectionPlayBtn}
                onPress={() => isAnyPlaying ? stopAudio() : playSequentially(yesterdayAyahs)}
                testID="play-yesterday-btn"
              >
                <Ionicons name={isAnyPlaying ? 'stop' : 'play'} size={16} color="#FFF" />
                <Text style={styles.sectionPlayText}>{isAnyPlaying ? 'Стоп' : 'Слушать'}</Text>
              </TouchableOpacity>
            </View>
            {yesterdayAyahs.map((a, i) => renderAyahRow(a, i))}
          </View>
        )}

        {/* Divider */}
        {blockAyahs.length > 0 && yesterdayAyahs.length > 0 && (
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Повторение блока</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        {/* Block section */}
        {blockAyahs.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Блок {blockInfo?.block_number} (аяты {blockInfo?.start_ayah}–{blockInfo?.end_ayah})
              </Text>
              <TouchableOpacity
                style={styles.sectionPlayBtn}
                onPress={() => isAnyPlaying ? stopAudio() : playSequentially(blockAyahs)}
                testID="play-block-btn"
              >
                <Ionicons name={isAnyPlaying ? 'stop' : 'play'} size={16} color="#FFF" />
                <Text style={styles.sectionPlayText}>{isAnyPlaying ? 'Стоп' : 'Слушать'}</Text>
              </TouchableOpacity>
            </View>
            {blockAyahs.map((a, i) => renderAyahRow(a, i))}
          </View>
        )}

        {/* Complete */}
        <TouchableOpacity
          style={[styles.completeBtn, completing && styles.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={completing}
          testID="complete-review-btn"
        >
          {completing ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="checkmark-done" size={22} color="#FFF" />
              <Text style={styles.completeBtnText}>Повторил все аяты  →  +5 очков</Text>
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
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginTop: 12 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  backBtnFull: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 24 },
  backBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  scroll: { flex: 1, padding: 16 },
  playAllBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 14,
    padding: 16, alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 14, ...Shadows.gold,
  },
  playAllBtnActive: { backgroundColor: Colors.error },
  playAllText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, ...Shadows.card,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  sectionPlayBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center', gap: 5,
  },
  sectionPlayText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  ayahRow: {
    flexDirection: 'row', gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  ayahRef: { fontSize: 12, color: Colors.primary, fontWeight: '700', minWidth: 40, paddingTop: 4 },
  ayahContent: { flex: 1 },
  arabic: { fontSize: 22, color: Colors.textPrimary, textAlign: 'right', lineHeight: 40, marginBottom: 4 },
  translit: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  completeBtn: {
    flexDirection: 'row', backgroundColor: Colors.gold, borderRadius: 14, padding: 18,
    alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6, ...Shadows.gold,
  },
  completeBtnDisabled: { backgroundColor: Colors.border },
  completeBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF', flex: 1, textAlign: 'center' },
});
