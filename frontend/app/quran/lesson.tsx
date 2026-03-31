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
import { HifzService, HifzLesson, HifzAyahData, HifzAyahRef } from '../../services/QuranHifzService';

export default function EveningLessonScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [lesson, setLesson] = useState<HifzLesson | null>(null);
  const [ayahsData, setAyahsData] = useState<(HifzAyahData & { is_basmala: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const l = await HifzService.getLesson(user.id);
        setLesson(l);
        const data = await Promise.all(
          l.ayahs.map(a => a.is_basmala
            ? Promise.resolve({ ...a, arabic_text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', transliteration: 'Bismillāhi r-raḥmāni r-raḥīm', surah_name: 'Al-Fatiha' } as HifzAyahData & { is_basmala: boolean })
            : HifzService.getAyahText(a.surah, a.ayah, a.audio_url).then(d => ({ ...d, is_basmala: false }))
          )
        );
        setAyahsData(data);
      } catch (e: any) {
        Alert.alert('Ошибка', e.message || 'Не удалось загрузить урок', [{ text: 'Назад', onPress: () => router.back() }]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const playAudio = async (url: string, key: string) => {
    if (!url) return;
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

  const toggleMark = (key: string, isBasmala: boolean) => {
    if (isBasmala) return; // Басмала не отмечается
    setMarked(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const handleComplete = async () => {
    if (!user?.id || !lesson) return;
    setCompleting(true);
    try {
      const { points_earned, surah_completed } = await HifzService.completeLesson(user.id, lesson.ayahs);
      await soundRef.current?.unloadAsync();

      if (surah_completed) {
        router.replace({ pathname: '/quran/completed', params: { surah: lesson.surah_number, name: lesson.surah_name } });
      } else {
        Alert.alert(
          'Урок завершён!',
          `+${points_earned} очков начислено!\nВыучено ${lesson.ayahs.filter(a => !a.is_basmala).length} аятов.`,
          [{ text: 'Отлично!', onPress: () => router.back() }]
        );
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
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Загрузка аятов...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const nonBasmala = ayahsData.filter(a => !a.is_basmala);
  const allMarked = marked.size === nonBasmala.length && nonBasmala.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stopAudio(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Вечерний урок</Text>
          {lesson && (
            <Text style={styles.subtitle}>
              {lesson.surah_name} ({lesson.surah_number}) · День {lesson.lesson_number}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {ayahsData.map((ayah, idx) => {
          const key = `${ayah.surah}:${ayah.ayah}`;
          const isPlaying = playingKey === key;
          const isDone = ayah.is_basmala || marked.has(key);

          return (
            <View key={key} style={[styles.ayahCard, isDone && !ayah.is_basmala && styles.ayahCardDone]}>
              {/* Badge */}
              <View style={styles.ayahMeta}>
                {ayah.is_basmala ? (
                  <View style={[styles.badge, { backgroundColor: Colors.gold }]}>
                    <Text style={styles.badgeText}>Басмала</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, isDone && { backgroundColor: Colors.green }]}>
                    <Text style={styles.badgeText}>{ayah.surah_name} {ayah.surah}:{ayah.ayah}</Text>
                  </View>
                )}
                {!ayah.is_basmala && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>Новый</Text>
                  </View>
                )}
              </View>

              {/* Arabic */}
              <Text style={[styles.arabic, ayah.is_basmala && styles.arabicBasmala]}>
                {ayah.arabic_text}
              </Text>

              {/* Transliteration */}
              {!!ayah.transliteration && (
                <Text style={styles.translit}>{ayah.transliteration}</Text>
              )}

              {/* Controls */}
              <View style={styles.controls}>
                <TouchableOpacity
                  style={[styles.audioBtn, isPlaying && styles.audioBtnActive]}
                  onPress={() => isPlaying ? stopAudio() : playAudio(ayah.audio_url, key)}
                  testID={`play-ayah-${idx}`}
                >
                  <Ionicons name={isPlaying ? 'stop-circle' : 'play-circle'} size={20} color={isPlaying ? Colors.error : Colors.primary} />
                  <Text style={[styles.audioBtnText, isPlaying && { color: Colors.error }]}>
                    {isPlaying ? 'Стоп' : 'Слушать'}
                  </Text>
                </TouchableOpacity>

                {!ayah.is_basmala && (
                  <TouchableOpacity
                    style={[styles.doneBtn, isDone && styles.doneBtnActive]}
                    onPress={() => toggleMark(key, ayah.is_basmala)}
                    testID={`mark-ayah-${idx}`}
                  >
                    <Ionicons name={isDone ? 'checkmark-circle' : 'checkmark-circle-outline'} size={20} color={isDone ? '#FFF' : Colors.green} />
                    <Text style={[styles.doneBtnText, isDone && { color: '#FFF' }]}>
                      {isDone ? 'Повторил' : 'Повторил'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* Complete button */}
        <TouchableOpacity
          style={[styles.completeBtn, (!allMarked || completing) && styles.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={!allMarked || completing}
          testID="complete-lesson-btn"
        >
          {completing ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="checkmark-done-circle" size={22} color="#FFF" />
              <Text style={styles.completeBtnText}>
                {allMarked
                  ? `Выучил все аяты (${nonBasmala.length}/${nonBasmala.length}) → +${nonBasmala.length * 10} очков`
                  : `Отметьте все аяты (${marked.size}/${nonBasmala.length})`}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: Colors.textSecondary },
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
  ayahCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1.5, borderColor: Colors.border, ...Shadows.card,
  },
  ayahCardDone: { borderColor: Colors.green, backgroundColor: Colors.greenBackground },
  ayahMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  badge: {
    backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  newBadge: { backgroundColor: Colors.goldBackground, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  newBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  arabic: { fontSize: 30, color: Colors.textPrimary, textAlign: 'right', lineHeight: 52, marginBottom: 12 },
  arabicBasmala: { fontSize: 26, color: Colors.primary, fontWeight: '600' },
  translit: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 14, fontStyle: 'italic' },
  controls: { flexDirection: 'row', gap: 10 },
  audioBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryLight, borderRadius: 10, paddingVertical: 10, gap: 6,
  },
  audioBtnActive: { backgroundColor: 'rgba(239,68,68,0.1)' },
  audioBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  doneBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.greenBackground, borderRadius: 10, paddingVertical: 10, gap: 6,
    borderWidth: 1.5, borderColor: Colors.green,
  },
  doneBtnActive: { backgroundColor: Colors.green },
  doneBtnText: { fontSize: 14, fontWeight: '600', color: Colors.green },
  completeBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 14, padding: 18,
    alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, ...Shadows.gold,
  },
  completeBtnDisabled: { backgroundColor: Colors.border },
  completeBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF', flex: 1, textAlign: 'center' },
});
