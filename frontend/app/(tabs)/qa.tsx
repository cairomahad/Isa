import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Shadows } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

import { Cache, TTL } from '../../services/cache';

const API = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

type Question = {
  id: string;
  question_text: string;
  answer_text?: string | null;
  status: 'pending' | 'answered';
  created_at: string;
  answered_at?: string | null;
  is_public?: boolean;
};

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function QuestionCard({ q, showAnswer = true }: { q: Question; showAnswer?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const answered = q.status === 'answered';
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.badge, answered ? styles.badgeGold : styles.badgeGray]}>
          <Ionicons name={answered ? 'checkmark-circle' : 'time-outline'} size={14} color={answered ? Colors.gold : Colors.textSecondary} />
          <Text style={[styles.badgeText, { color: answered ? Colors.gold : Colors.textSecondary }]}>
            {answered ? 'Отвечено' : 'Ожидание'}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(q.created_at)}</Text>
      </View>

      <Text style={styles.questionText}>{q.question_text}</Text>

      {showAnswer && answered && (
        <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded(!expanded)} testID="expand-answer-btn">
          <Text style={styles.expandText}>{expanded ? 'Скрыть ответ' : 'Посмотреть ответ'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gold} />
        </TouchableOpacity>
      )}

      {expanded && q.answer_text && (
        <View style={styles.answerBox}>
          <View style={styles.answerHeader}>
            <Ionicons name="person-circle" size={22} color={Colors.gold} />
            <Text style={styles.answerLabel}>Ответ Шейха</Text>
          </View>
          <Text style={styles.answerText}>{q.answer_text}</Text>
        </View>
      )}
    </View>
  );
}

export default function QAScreen() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'my' | 'public'>('my');
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [publicQuestions, setPublicQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [questionText, setQuestionText] = useState('');

  const fetchMyQuestions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const r = await fetch(`${API}/api/qa/my-questions?user_id=${user.id}`);
      const d = await r.json();
      setMyQuestions(d.questions || []);
    } catch (e) { console.warn('fetchMyQuestions error', e); }
  }, [user?.id]);

  const fetchPublicQuestions = useCallback(async () => {
    try {
      const cached = await Cache.get<Question[]>('cache_public_qa', TTL.PUBLIC_QA);
      if (cached) { setPublicQuestions(cached); return; }
      const r = await fetch(`${API}/api/qa/public`);
      const d = await r.json();
      const qs = d.questions || [];
      setPublicQuestions(qs);
      await Cache.set('cache_public_qa', qs);
    } catch (e) { console.warn('fetchPublicQuestions error', e); }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMyQuestions(), fetchPublicQuestions()]);
    setLoading(false);
  }, [fetchMyQuestions, fetchPublicQuestions]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const handleSubmit = async () => {
    if (!questionText.trim() || questionText.trim().length < 10) {
      Alert.alert('Ошибка', 'Вопрос должен быть не менее 10 символов');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API}/api/qa/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, question_text: questionText.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Ошибка отправки');
      }
      setQuestionText('');
      setShowForm(false);
      Alert.alert('Отправлено!', 'Ваш вопрос отправлен Шейху. Ожидайте ответа.');
      await fetchMyQuestions();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setSending(false);
    }
  };

  const currentList = tab === 'my' ? myQuestions : publicQuestions;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Вопросы Шейху</Text>
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={22} color={Colors.gold} />
            <Text style={styles.infoText}>
              Задайте вопрос по религии и Шейх ответит вам в ближайшее время
            </Text>
          </View>

          {/* Ask button */}
          {!showForm && (
            <TouchableOpacity style={styles.askBtn} onPress={() => setShowForm(true)} testID="ask-question-btn">
              <Ionicons name="add-circle" size={22} color={Colors.background} />
              <Text style={styles.askBtnText}>Задать вопрос</Text>
            </TouchableOpacity>
          )}

          {/* Question Form */}
          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Ваш вопрос</Text>
              <TextInput
                testID="question-input"
                style={styles.textarea}
                placeholder="Напишите вопрос подробно (минимум 10 символов)..."
                placeholderTextColor={Colors.textSecondary}
                value={questionText}
                onChangeText={setQuestionText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{questionText.length} символов</Text>
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowForm(false); setQuestionText(''); }} testID="cancel-question-btn">
                  <Text style={styles.cancelBtnText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendBtn, (sending || questionText.trim().length < 10) && styles.sendBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={sending || questionText.trim().length < 10}
                  testID="send-question-btn"
                >
                  {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendBtnText}>Отправить</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabRow}>
            {(['my', 'public'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)}
                testID={`tab-${t}`}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'my' ? `Мои вопросы (${myQuestions.length})` : `Публичные Q&A (${publicQuestions.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List */}
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          ) : currentList.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>
                {tab === 'my' ? 'У вас пока нет вопросов' : 'Публичных вопросов пока нет'}
              </Text>
            </View>
          ) : (
            currentList.map(q => (
              <QuestionCard key={q.id} q={q} showAnswer={true} />
            ))
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.goldBackground || '#FFF8E7',
    borderRadius: 16, padding: 14, marginHorizontal: 20, marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: Colors.gold,
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  askBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 20,
    marginHorizontal: 20, marginBottom: 20, justifyContent: 'center',
  },
  askBtnText: { color: Colors.background, fontWeight: '700', fontSize: 16 },
  formCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 20,
    marginHorizontal: 20, marginBottom: 20, ...Shadows.card,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  textarea: {
    backgroundColor: Colors.backgroundPage, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.border, padding: 12, minHeight: 100,
    fontSize: 15, color: Colors.textPrimary,
  },
  charCount: { fontSize: 11, color: Colors.textTertiary, textAlign: 'right', marginTop: 4, marginBottom: 12 },
  formActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  sendBtn: {
    flex: 2, backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: Colors.backgroundPage, borderRadius: 14, padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  card: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 16,
    marginHorizontal: 20, marginBottom: 14, ...Shadows.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeGold: { backgroundColor: '#FFF8E7' },
  badgeGray: { backgroundColor: Colors.backgroundPage },
  badgeText: { fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: 11, color: Colors.textTertiary },
  questionText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22, marginBottom: 10 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  expandText: { fontSize: 14, color: Colors.gold, fontWeight: '600' },
  answerBox: {
    backgroundColor: Colors.goldBackground || '#FFF8E7',
    borderRadius: 14, padding: 14, marginTop: 12,
    borderLeftWidth: 3, borderLeftColor: Colors.gold,
  },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  answerLabel: { fontSize: 13, fontWeight: '700', color: Colors.gold },
  answerText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textTertiary, textAlign: 'center' },
});
