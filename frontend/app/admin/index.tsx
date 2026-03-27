import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList, Alert, TextInput,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';

type AdminStats = {
  totalUsers: number;
  activeToday: number;
  totalLessons: number;
  pendingHomework: number;
};

type SheikhQuestion = {
  id: string;
  question: string;
  answer?: string;
  status: string;
  display_name?: string;
  created_at: string;
};

export default function AdminScreen() {
  const router = useRouter();
  const { isAdmin, session } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [questions, setQuestions] = useState<SheikhQuestion[]>([]);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [activeTab, setActiveTab] = useState<'stats' | 'questions'>('stats');

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)/settings');
      return;
    }
    fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [usersRes, lessonsRes, questionsRes] = await Promise.all([
        supabase.from('users').select('id, created_at').order('created_at', { ascending: false }),
        supabase.from('video_lessons').select('id'),
        supabase.from('sheikh_questions').select('*, users(display_name)').order('created_at', { ascending: false }),
      ]);

      const users = usersRes.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeToday = users.filter((u: any) => new Date(u.created_at) >= today).length;

      setStats({
        totalUsers: users.length,
        activeToday,
        totalLessons: lessonsRes.data?.length || 0,
        pendingHomework: 0,
      });

      const rawQ = questionsRes.data || [];
      setQuestions(rawQ.map((q: any) => ({
        ...q,
        display_name: q.users?.display_name || 'Аноним',
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const answerQuestion = async (id: string) => {
    if (!answerText.trim()) return;
    try {
      await supabase.from('sheikh_questions').update({
        answer: answerText.trim(),
        status: 'answered',
        is_published: true,
      }).eq('id', id);
      setQuestions((prev) =>
        prev.map((q) => q.id === id ? { ...q, answer: answerText.trim(), status: 'answered' } : q)
      );
      setAnsweringId(null);
      setAnswerText('');
      Alert.alert('Готово', 'Ответ сохранён');
    } catch {
      Alert.alert('Ошибка', 'Не удалось сохранить ответ');
    }
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Панель администратора</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
          testID="admin-tab-stats"
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            📊 Статистика
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'questions' && styles.activeTab]}
          onPress={() => setActiveTab('questions')}
          testID="admin-tab-questions"
        >
          <Text style={[styles.tabText, activeTab === 'questions' && styles.activeTabText]}>
            ❓ Вопросы ({questions.filter((q) => q.status === 'pending').length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'stats' && (
          <View>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{stats?.totalUsers}</Text>
                <Text style={styles.statLabel}>Всего студентов</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{stats?.activeToday}</Text>
                <Text style={styles.statLabel}>Сегодня новых</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{stats?.totalLessons}</Text>
                <Text style={styles.statLabel}>Уроков</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{questions.filter((q) => q.status === 'pending').length}</Text>
                <Text style={styles.statLabel}>Новых вопросов</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'questions' && (
          <View>
            {questions.length === 0 && (
              <Text style={styles.emptyText}>Вопросов нет</Text>
            )}
            {questions.map((q) => (
              <View key={q.id} style={styles.questionCard}>
                <View style={styles.qHeader}>
                  <Text style={styles.qUser}>{q.display_name}</Text>
                  <View style={[styles.qStatus, q.status === 'answered' && styles.qStatusDone]}>
                    <Text style={styles.qStatusText}>
                      {q.status === 'answered' ? 'Отвечено' : 'Ожидает'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.qText}>{q.question}</Text>
                {q.answer && (
                  <View style={styles.qAnswer}>
                    <Text style={styles.qAnswerLabel}>Ответ:</Text>
                    <Text style={styles.qAnswerText}>{q.answer}</Text>
                  </View>
                )}
                {q.status !== 'answered' && (
                  <>
                    {answeringId === q.id ? (
                      <View style={styles.answerArea}>
                        <TextInput
                          style={styles.answerInput}
                          value={answerText}
                          onChangeText={setAnswerText}
                          placeholder="Введите ответ..."
                          placeholderTextColor={Colors.textSecondary}
                          multiline
                          numberOfLines={4}
                          testID="answer-input"
                        />
                        <View style={styles.answerButtons}>
                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => { setAnsweringId(null); setAnswerText(''); }}
                          >
                            <Text style={styles.cancelBtnText}>Отмена</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={() => answerQuestion(q.id)}
                            testID="submit-answer-btn"
                          >
                            <Text style={styles.submitBtnText}>Ответить</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.replyBtn}
                        onPress={() => setAnsweringId(q.id)}
                        testID={`reply-${q.id}`}
                      >
                        <Ionicons name="return-down-forward" size={16} color={Colors.gold} />
                        <Text style={styles.replyBtnText}>Ответить</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkGreen,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
  adminBadge: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  adminBadgeText: { fontSize: 11, fontWeight: 'bold', color: Colors.background },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.cardDark,
    margin: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: Colors.gold },
  tabText: { fontSize: 13, color: Colors.mediumGreen, fontWeight: '500' },
  activeTabText: { color: Colors.background, fontWeight: 'bold' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.cardDark,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  statNum: { fontSize: 28, fontWeight: 'bold', color: Colors.gold },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', paddingVertical: 32 },
  questionCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  qUser: { fontSize: 13, color: Colors.gold, fontWeight: '600' },
  qStatus: {
    backgroundColor: Colors.darkGreen,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  qStatusDone: { backgroundColor: Colors.mediumGreen },
  qStatusText: { fontSize: 11, color: Colors.textPrimary },
  qText: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22, marginBottom: 12 },
  qAnswer: {
    backgroundColor: Colors.cardLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  qAnswerLabel: { fontSize: 12, color: Colors.gold, fontWeight: '600', marginBottom: 4 },
  qAnswerText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  answerArea: { marginTop: 8 },
  answerInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  answerButtons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.cardLight,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 14 },
  submitBtn: {
    flex: 1,
    backgroundColor: Colors.gold,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  submitBtnText: { color: Colors.background, fontSize: 14, fontWeight: 'bold' },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  replyBtnText: { color: Colors.gold, fontSize: 14 },
});
