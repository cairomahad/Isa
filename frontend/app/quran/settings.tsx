import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Switch,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { QuranService, QuranProgram } from '../../services/QuranService';
import { scheduleQuranNotifications, cancelQuranNotifications } from '../../services/notificationService';

export default function QuranSettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [program, setProgram] = useState<QuranProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Start program form
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [customSurah, setCustomSurah] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // Settings form
  const [eveningHour, setEveningHour] = useState(20);
  const [morningHour, setMorningHour] = useState(7);

  const popularSurahs = QuranService.getPopularSurahs();

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const tid = await QuranService.getTelegramId(user.id);
      setTelegramId(tid);
      if (tid) {
        const prog = await QuranService.getProgram(tid);
        setProgram(prog);
        if (prog) {
          setEveningHour(prog.evening_hour);
          setMorningHour(prog.morning_hour);
        }
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const handleStart = async () => {
    if (!telegramId) return;
    let surah = selectedSurah;
    if (showCustom) {
      const n = parseInt(customSurah);
      if (isNaN(n) || n < 1 || n > 114) {
        Alert.alert('Ошибка', 'Введите номер суры от 1 до 114');
        return;
      }
      surah = n;
    }
    if (!surah) {
      Alert.alert('Ошибка', 'Выберите суру для начала');
      return;
    }
    setSaving(true);
    try {
      const prog = await QuranService.startProgram(telegramId, surah, 1);
      setProgram(prog);
      await scheduleQuranNotifications(eveningHour, morningHour);
      Alert.alert('Готово!', `Программа начата с суры ${surah}`);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось начать программу');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!telegramId || !program) return;
    setSaving(true);
    try {
      await QuranService.updateProgramSettings(telegramId, {
        evening_hour: eveningHour,
        morning_hour: morningHour,
      });
      await scheduleQuranNotifications(eveningHour, morningHour);
      Alert.alert('Сохранено!', 'Настройки обновлены');
      router.back();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePause = () => {
    if (!telegramId || !program) return;
    Alert.alert(
      program.is_active ? 'Пауза программы' : 'Возобновить программу',
      program.is_active ? 'Приостановить изучение Корана?' : 'Продолжить изучение?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: program.is_active ? 'Пауза' : 'Продолжить',
          onPress: async () => {
            await QuranService.updateProgramSettings(telegramId, { is_active: !program.is_active });
            if (program.is_active) await cancelQuranNotifications();
            else await scheduleQuranNotifications(eveningHour, morningHour);
            setProgram({ ...program, is_active: !program.is_active });
          },
        },
      ]
    );
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={Colors.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{program ? 'Настройки программы' : 'Начать хифз'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {!program ? (
          <>
            <Text style={styles.sectionTitle}>Выберите суру для начала</Text>

            {/* Popular surahs */}
            <View style={styles.surahGrid}>
              {popularSurahs.slice(0, 8).map(s => (
                <TouchableOpacity
                  key={s.number}
                  style={[styles.surahChip, selectedSurah === s.number && !showCustom && styles.surahChipActive]}
                  onPress={() => { setSelectedSurah(s.number); setShowCustom(false); }}
                >
                  <Text style={styles.surahChipAr}>{s.nameAr}</Text>
                  <Text style={[styles.surahChipRu, selectedSurah === s.number && !showCustom && { color: Colors.primary }]}>
                    {s.nameRu}
                  </Text>
                  <Text style={styles.surahChipNum}>{s.ayahs} аятов</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Или введите номер суры (1–114)</Text>
            <TextInput
              style={styles.input}
              placeholder="Например: 67 (Аль-Мульк)"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="number-pad"
              value={customSurah}
              onChangeText={(v) => { setCustomSurah(v); setShowCustom(true); setSelectedSurah(null); }}
            />

            <Text style={styles.sectionTitle}>Время уведомлений</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeCard}>
                <Ionicons name="moon" size={24} color={Colors.primary} />
                <Text style={styles.timeLabel}>Вечерний урок</Text>
                <View style={styles.timeControls}>
                  <TouchableOpacity onPress={() => setEveningHour(Math.max(18, eveningHour - 1))}>
                    <Ionicons name="remove-circle" size={28} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{eveningHour}:00</Text>
                  <TouchableOpacity onPress={() => setEveningHour(Math.min(23, eveningHour + 1))}>
                    <Ionicons name="add-circle" size={28} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.timeCard}>
                <Ionicons name="sunny" size={24} color={Colors.gold} />
                <Text style={styles.timeLabel}>Утреннее повтор.</Text>
                <View style={styles.timeControls}>
                  <TouchableOpacity onPress={() => setMorningHour(Math.max(4, morningHour - 1))}>
                    <Ionicons name="remove-circle" size={28} color={Colors.gold} />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{morningHour}:00</Text>
                  <TouchableOpacity onPress={() => setMorningHour(Math.min(12, morningHour + 1))}>
                    <Ionicons name="add-circle" size={28} color={Colors.gold} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.startBtn, saving && { opacity: 0.5 }]}
              onPress={handleStart}
              disabled={saving}
              testID="start-program-btn"
            >
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <><Ionicons name="book" size={20} color="#FFF" /><Text style={styles.startBtnText}>Начать программу</Text></>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Current position */}
            <View style={styles.posBlock}>
              <Text style={styles.posLabel}>Текущая позиция</Text>
              <Text style={styles.posValue}>Сура {program.current_surah}, аят {program.current_ayah}</Text>
              <Text style={styles.posWeek}>Неделя {QuranService.calcStudyWeek(program.started_at)} · {
                QuranService.getPortionConfig(QuranService.calcStudyWeek(program.started_at)).phase
              }</Text>
            </View>

            {/* Program status */}
            <View style={[styles.statusBadge, { backgroundColor: program.is_active ? Colors.greenBackground : 'rgba(239,68,68,0.1)' }]}>
              <Ionicons
                name={program.is_active ? 'checkmark-circle' : 'pause-circle'}
                size={18}
                color={program.is_active ? Colors.green : Colors.error}
              />
              <Text style={{ color: program.is_active ? Colors.green : Colors.error, fontWeight: '600', fontSize: 14 }}>
                {program.is_active ? 'Программа активна' : 'На паузе'}
              </Text>
            </View>

            {/* Time settings */}
            <Text style={styles.sectionTitle}>Время уведомлений</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeCard}>
                <Ionicons name="moon" size={24} color={Colors.primary} />
                <Text style={styles.timeLabel}>Вечерний урок</Text>
                <View style={styles.timeControls}>
                  <TouchableOpacity onPress={() => setEveningHour(Math.max(18, eveningHour - 1))}>
                    <Ionicons name="remove-circle" size={28} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{eveningHour}:00</Text>
                  <TouchableOpacity onPress={() => setEveningHour(Math.min(23, eveningHour + 1))}>
                    <Ionicons name="add-circle" size={28} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.timeCard}>
                <Ionicons name="sunny" size={24} color={Colors.gold} />
                <Text style={styles.timeLabel}>Утреннее повтор.</Text>
                <View style={styles.timeControls}>
                  <TouchableOpacity onPress={() => setMorningHour(Math.max(4, morningHour - 1))}>
                    <Ionicons name="remove-circle" size={28} color={Colors.gold} />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{morningHour}:00</Text>
                  <TouchableOpacity onPress={() => setMorningHour(Math.min(12, morningHour + 1))}>
                    <Ionicons name="add-circle" size={28} color={Colors.gold} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings} disabled={saving} testID="save-settings-btn">
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Сохранить настройки</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.pauseBtn, !program.is_active && styles.resumeBtn]} onPress={handlePause}>
              <Ionicons name={program.is_active ? 'pause' : 'play'} size={18} color={program.is_active ? Colors.error : Colors.green} />
              <Text style={{ color: program.is_active ? Colors.error : Colors.green, fontWeight: '600', fontSize: 15 }}>
                {program.is_active ? 'Поставить на паузу' : 'Возобновить программу'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  scroll: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 24, marginBottom: 14 },
  surahGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  surahChip: { backgroundColor: Colors.surface, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, minWidth: '22%' },
  surahChipActive: { borderColor: Colors.primary, backgroundColor: Colors.goldBackground },
  surahChipAr: { fontSize: 18, color: Colors.primary, marginBottom: 2 },
  surahChipRu: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  surahChipNum: { fontSize: 10, color: Colors.textTertiary, marginTop: 2 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  timeRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  timeCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, ...Shadows.card },
  timeLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  timeControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeValue: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, minWidth: 48, textAlign: 'center' },
  startBtn: { flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24, ...Shadows.gold },
  startBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  posBlock: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginTop: 24, alignItems: 'center', ...Shadows.card },
  posLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6, fontWeight: '500' },
  posValue: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  posWeek: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, gap: 8, marginTop: 12 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, ...Shadows.gold },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: 14, marginTop: 12, gap: 8, borderWidth: 1, borderColor: Colors.error },
  resumeBtn: { backgroundColor: Colors.greenBackground, borderColor: Colors.green },
});
