import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

type VideoLesson = { id: string; title: string; category: string };
type ParsedQ = { question: string; options: string[]; correct_option: number; score: number; valid: boolean; error?: string };

function parseLine(line: string): ParsedQ {
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 6) {
    return { question: '', options: [], correct_option: 0, score: 5, valid: false, error: 'Нужно 6 полей через |' };
  }
  const question = parts[0];
  const options = parts.slice(1, 5);
  const letter = parts[5].toLowerCase();
  const correct_option = ['a', 'b', 'c', 'd'].indexOf(letter);
  if (correct_option === -1) {
    return { question, options, correct_option: 0, score: 5, valid: false, error: 'Правильный ответ должен быть a/b/c/d' };
  }
  return { question, options, correct_option, score: 5, valid: true };
}

export default function ManageQuizScreen() {
  const router = useRouter();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null);
  const [questionsText, setQuestionsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<ParsedQ[]>([]);
  const [showLessonPicker, setShowLessonPicker] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/lessons`);
      const data = await res.json();
      setLessons(data.lessons || []);
    } catch (e) {
      console.warn('Error fetching lessons:', e);
    }
  };

  const handlePreview = () => {
    const lines = questionsText.split('\n').filter(l => l.trim());
    setPreview(lines.map(parseLine));
  };

  const handleSubmit = async () => {
    if (!selectedLesson) {
      Alert.alert('Ошибка', 'Выберите урок');
      return;
    }
    const lines = questionsText.split('\n').filter(l => l.trim());
    const parsed = lines.map(parseLine);
    const valid = parsed.filter(q => q.valid);
    const invalid = parsed.filter(q => !q.valid);

    if (valid.length === 0) {
      Alert.alert('Ошибка', 'Нет корректных вопросов');
      return;
    }
    if (invalid.length > 0) {
      Alert.alert('Предупреждение', `${invalid.length} строк не удалось разобрать. Продолжить?`, [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Продолжить', onPress: () => submitQuestions(valid) },
      ]);
      return;
    }
    submitQuestions(valid);
  };

  const submitQuestions = async (questions: ParsedQ[]) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/quiz/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: selectedLesson!.id,
          questions: questions.map(q => ({
            question: q.question,
            options: q.options,
            correct_option: q.correct_option,
            score: q.score,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка');
      Alert.alert('Успешно!', data.message);
      setQuestionsText('');
      setPreview([]);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Управление тестами</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Lesson picker */}
        <Text style={styles.label}>Выберите урок *</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowLessonPicker(v => !v)} testID="lesson-picker">
          <Text style={[styles.pickerText, !selectedLesson && { color: Colors.textSecondary }]}>
            {selectedLesson ? selectedLesson.title : 'Tap to select lesson...'}
          </Text>
          <Ionicons name={showLessonPicker ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.primary} />
        </TouchableOpacity>
        {showLessonPicker && (
          <View style={styles.dropdownList}>
            {lessons.map(l => (
              <TouchableOpacity
                key={l.id}
                style={[styles.dropdownItem, selectedLesson?.id === l.id && styles.dropdownItemActive]}
                onPress={() => { setSelectedLesson(l); setShowLessonPicker(false); }}
              >
                <Text style={[styles.dropdownText, selectedLesson?.id === l.id && { color: Colors.primary }]}>
                  {l.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Format hint */}
        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>Формат (одна строка — один вопрос):</Text>
          <Text style={styles.hintText}>
            {'Вопрос | Ответ A | Ответ B | Ответ C | Ответ D | правильный'}
          </Text>
          <Text style={styles.hintExample}>
            {'Что такое фикх? | Наука о языке | Наука об обязанностях | Наука о торговле | Не знаю | b'}
          </Text>
          <Text style={styles.hintNote}>Правильный: a, b, c или d</Text>
        </View>

        {/* Questions textarea */}
        <Text style={styles.label}>Вопросы (каждый с новой строки)</Text>
        <TextInput
          style={styles.textarea}
          value={questionsText}
          onChangeText={setQuestionsText}
          placeholder={'Вопрос 1 | A | B | C | D | a\nВопрос 2 | A | B | C | D | b'}
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          testID="questions-input"
        />

        {/* Preview */}
        <TouchableOpacity style={styles.previewBtn} onPress={handlePreview}>
          <Ionicons name="eye" size={18} color={Colors.primary} />
          <Text style={styles.previewBtnText}>Предпросмотр</Text>
        </TouchableOpacity>

        {preview.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Разобрано {preview.filter(q => q.valid).length} / {preview.length} вопросов</Text>
            {preview.map((q, i) => (
              <View key={i} style={[styles.previewCard, !q.valid && styles.previewCardError]}>
                {q.valid ? (
                  <>
                    <Text style={styles.previewQ}>{i + 1}. {q.question}</Text>
                    {q.options.map((o, oi) => (
                      <Text key={oi} style={[styles.previewOpt, oi === q.correct_option && styles.previewCorrect]}>
                        {['A', 'B', 'C', 'D'][oi]}. {o} {oi === q.correct_option ? '✓' : ''}
                      </Text>
                    ))}
                  </>
                ) : (
                  <Text style={styles.previewError}>{i + 1}. Ошибка: {q.error}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, saving && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={saving}
          testID="submit-quiz-btn"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Добавить вопросы</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  scroll: { flex: 1, paddingHorizontal: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginTop: 20, marginBottom: 8 },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  pickerText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  dropdownList: {
    backgroundColor: Colors.surface, borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: Colors.border, maxHeight: 220,
  },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownItemActive: { backgroundColor: Colors.goldBackground },
  dropdownText: { fontSize: 15, color: Colors.textPrimary },
  hintCard: {
    backgroundColor: Colors.greenBackground, borderRadius: 12, padding: 14,
    marginTop: 16, borderLeftWidth: 3, borderLeftColor: Colors.green,
  },
  hintTitle: { fontSize: 13, fontWeight: '700', color: Colors.green, marginBottom: 6 },
  hintText: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  hintExample: { fontSize: 12, color: Colors.textPrimary, fontStyle: 'italic', marginBottom: 4 },
  hintNote: { fontSize: 12, color: Colors.textSecondary },
  textarea: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
    minHeight: 180, textAlignVertical: 'top',
  },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.goldBackground, borderRadius: 10, paddingVertical: 12, marginTop: 12, gap: 6,
  },
  previewBtnText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  previewSection: { marginTop: 16 },
  previewTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  previewCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  previewCardError: { borderColor: Colors.error, backgroundColor: 'rgba(239,68,68,0.05)' },
  previewQ: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  previewOpt: { fontSize: 13, color: Colors.textSecondary, marginLeft: 10, marginBottom: 2 },
  previewCorrect: { color: Colors.green, fontWeight: '700' },
  previewError: { fontSize: 13, color: Colors.error },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 20, ...Shadows.gold,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
