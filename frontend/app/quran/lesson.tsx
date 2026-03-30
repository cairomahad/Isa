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
import { QuranService, AyahData, QuranProgram } from '../../services/QuranService';

export default function EveningLessonScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [program, setProgram] = useState<QuranProgram | null>(null);
  const [ayahs, setAyahs] = useState<AyahData[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [completedAyahs, setCompletedAyahs] = useState<Set<string>>(new Set());
  const soundRef = useRef<Audio.Sound | null>(null);

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

      const prog = await QuranService.getProgram(tid);
      if (!prog) return setLoading(false);
      setProgram(prog);

      const week = QuranService.calcStudyWeek(prog.started_at);
      const { ayahs: lessonAyahs } = await QuranService.buildLessonAyahs(
        prog.current_surah, prog.current_ayah, week
      );
      setAyahs(lessonAyahs);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const playAudio = async (url: string, key: string) => {
    if (!url) return Alert.alert('Нет аудио', 'Аудиофайл недоступен офлайн');
    try {
      await soundRef.current?.unloadAsync();
      setPlayingKey(key);
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingKey(null);
          sound.unloadAsync();
        }
      });
    } catch (e) {
      setPlayingKey(null);
      Alert.alert('Ошибка', 'Не удалось воспроизвести аудио');
    }
  };

  const stopAudio = async () => {
    await soundRef.current?.stopAsync();
    setPlayingKey(null);
  };

  const toggleAyahComplete = (key: string) => {
    setCompletedAyahs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleCompleteAll = async () => {
    if (!telegramId || !program || !ayahs.length) return;
    setCompleting(true);
    try {
      await QuranService.completeDailyLesson(telegramId, ayahs, program);
      await QuranService.awardPoints(user!.id, ayahs.length * 5);
      Alert.alert(
        'Урок завершён!',
        `+${ayahs.length * 5} очков начислено!\nВыучено ${ayahs.length} аятов.`,
        [{ text: 'Отлично!', onPress: () => router.back() }]
      );
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

  const allMarked = completedAyahs.size === ayahs.length && ayahs.length > 0;
  const week = program ? QuranService.calcStudyWeek(program.started_at) : 1;
  const { phase } = QuranService.getPortionConfig(week);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { stopAudio(); router.back(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Вечерний урок</Text>
          <Text style={styles.subtitle}>Неделя {week} · {phase} · {ayahs.length} аятов</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.instruction}>
          Читайте каждый аят вслух несколько раз. Нажмите на аудио для прослушивания.
          Отмечайте аяты по мере запоминания.
        </Text>

        {ayahs.map((ayah, idx) => {
          const key = `${ayah.surah}:${ayah.ayah}`;
          const isPlaying = playingKey === key;
          const isDone = completedAyahs.has(key);

          return (
            <View key={key} style={[styles.ayahCard, isDone && styles.ayahCardDone]}>
              {/* Ayah number */}
              <View style={styles.ayahMeta}>
                <View style={[styles.ayahNumBadge, isDone && { backgroundColor: Colors.green }]}>
                  <Text style={styles.ayahNum}>{idx + 1}</Text>
                </View>
                <Text style={styles.ayahRef}>{ayah.surahNameEn} {ayah.surah}:{ayah.ayah}</Text>
                <Text style={styles.ayahAr}>﴿{ayah.ayah}﴾</Text>
              </View>

              {/* Arabic text */}
              <Text style={styles.arabic}>{ayah.arabic}</Text>

              {/* Transliteration */}
              {!!ayah.translit && (
                <Text style={styles.translit}>{ayah.translit}</Text>
              )}

              {/* Controls */}
              <View style={styles.ayahControls}>
                <TouchableOpacity
                  style={[styles.audioBtn, isPlaying && styles.audioBtnActive]}
                  onPress={() => isPlaying ? stopAudio() : playAudio(ayah.audioUrl, key)}
                  testID={`play-ayah-${idx}`}
                >
                  <Ionicons
                    name={isPlaying ? 'stop-circle' : 'play-circle'}
                    size={22}
                    color={isPlaying ? Colors.error : Colors.primary}
                  />
                  <Text style={[styles.audioBtnText, isPlaying && { color: Colors.error }]}>
                    {isPlaying ? 'Стоп' : 'Слушать'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.doneBtn, isDone && styles.doneBtnActive]}
                  onPress={() => toggleAyahComplete(key)}
                  testID={`mark-ayah-${idx}`}
                >
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={22}
                    color={isDone ? '#FFFFFF' : Colors.green}
                  />
                  <Text style={[styles.doneBtnText, isDone && { color: '#FFFFFF' }]}>
                    {isDone ? 'Выучил' : 'Отметить'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Complete button */}
        <TouchableOpacity
          style={[styles.completeBtn, (!allMarked || completing) && styles.completeBtnDisabled]}
          onPress={handleCompleteAll}
          disabled={!allMarked || completing}
          testID="complete-lesson-btn"
        >
          {completing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-done-circle" size={22} color="#FFFFFF" />
              <Text style={styles.completeBtnText}>
                {allMarked ? `Завершить урок (+${ayahs.length * 5} очков)` : `Отметьте все аяты (${completedAyahs.size}/${ayahs.length})`}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  instruction: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginVertical: 16, paddingHorizontal: 8 },
  ayahCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: Colors.border, ...Shadows.card },
  ayahCardDone: { borderColor: Colors.green, backgroundColor: Colors.greenBackground },
  ayahMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  ayahNumBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  ayahNum: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  ayahRef: { fontSize: 13, color: Colors.textSecondary, flex: 1, fontWeight: '500' },
  ayahAr: { fontSize: 16, color: Colors.textSecondary },
  arabic: { fontSize: 30, color: Colors.textPrimary, textAlign: 'right', lineHeight: 52, marginBottom: 12, fontWeight: '400' },
  translit: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 14, fontStyle: 'italic' },
  ayahControls: { flexDirection: 'row', gap: 10 },
  audioBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight, borderRadius: 10, paddingVertical: 10, gap: 6 },
  audioBtnActive: { backgroundColor: 'rgba(239,68,68,0.1)' },
  audioBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  doneBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.greenBackground, borderRadius: 10, paddingVertical: 10, gap: 6, borderWidth: 1.5, borderColor: Colors.green },
  doneBtnActive: { backgroundColor: Colors.green },
  doneBtnText: { fontSize: 14, fontWeight: '600', color: Colors.green },
  completeBtn: { flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 14, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, marginBottom: 16, ...Shadows.gold },
  completeBtnDisabled: { backgroundColor: Colors.border },
  completeBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', flex: 1 },
});
