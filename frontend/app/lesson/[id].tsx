import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useEffect, useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { scheduleLessonUnlockNotification } from '../../services/notificationService';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

type Lesson = {
  id: string;
  title: string;
  description: string;
  file_id?: string;
  video_url?: string;
  category: string;
  pdf_file_id?: string;
};

type QuizTask = {
  id: string;
  video_id: string;
  question: string;
  options: string[];
  correct_option: number;
  score: number;
};

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const Colors = useColors();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quizTasks, setQuizTasks] = useState<QuizTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [inQuiz, setInQuiz] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!id) return;
      try {
        const { data: l } = await supabase
          .from('video_lessons')
          .select('*')
          .eq('id', id)
          .single();
        setLesson(l || null);

        const { data: quiz } = await supabase
          .from('quiz_tasks')
          .select('*')
          .eq('video_id', id);

        const letterToIdx: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
        const parsed = (quiz || []).map((q: any) => ({
          id: String(q.id),
          video_id: String(q.video_id),
          question: q.question || '',
          options: [q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || ''],
          correct_option: letterToIdx[String(q.correct_option || 'a').toLowerCase()] ?? 0,
          score: 5,
        }));
        setQuizTasks(parsed);
      } catch (e) {
        console.warn('Lesson fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
  }, [id]);

  const handleAnswer = (index: number) => {
    if (answered) return;
    setSelectedIndex(index);
    setAnswered(true);
    const task = quizTasks[currentQ];
    const isCorrect = index === task.correct_option;
    if (isCorrect) setScore(s => s + (task.score || 5));

    const delay = isCorrect ? 800 : 1300;
    setTimeout(() => {
      if (currentQ < quizTasks.length - 1) {
        setCurrentQ(q => q + 1);
        setSelectedIndex(null);
        setAnswered(false);
      } else {
        setQuizDone(true);
      }
    }, delay);
  };

  const handleFinishQuiz = async () => {
    // Submit quiz score
    if (user?.id && id) {
      try {
        await fetch(`${API_URL}/api/quiz/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, video_id: id, score, total: quizTasks.length || 10 }),
        });
      } catch (e) {
        console.warn('Quiz submit error:', e);
      }
    }
    // Mark lesson complete + schedule next-unlock notification
    await completeLesson();
    router.back();
  };

  const completeLesson = async () => {
    if (!user?.id || !id || lessonCompleted) return;
    try {
      const res = await fetch(`${API_URL}/api/lesson/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setLessonCompleted(true);
        // Schedule notification 3 days later
        const courseLabel = lesson?.category === 'fard_shafi' ? 'Шафиитский мазхаб'
          : lesson?.category === 'fard_hanafi' ? 'Ханафитский мазхаб'
          : lesson?.category === 'arab' ? 'Арабский язык'
          : 'Семейные отношения';
        const unlockDate = data.next_unlock_date
          ? new Date(data.next_unlock_date)
          : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await scheduleLessonUnlockNotification(lesson?.title || '', courseLabel, unlockDate);
      }
    } catch (e) {
      console.warn('Complete lesson error:', e);
    }
  };

  const videoId = lesson?.file_id || lesson?.video_url || '';
  const isValidYouTube = videoId.length === 11;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  // Quiz done screen
  if (quizDone) {
    const total = quizTasks.reduce((s, q) => s + (q.score || 5), 0);
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.doneEmoji}>{score >= total * 0.8 ? '🎉' : score >= total * 0.5 ? '👍' : '📖'}</Text>
          <Text style={styles.doneTitle}>Тест завершён!</Text>
          <Text style={styles.doneScore}>Ваш результат: {score} / {total}</Text>
          <Text style={styles.donePlus}>+{score} очков</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={handleFinishQuiz} testID="finish-quiz-btn">
            <Text style={styles.doneBtnText}>Завершить</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Quiz in progress
  if (inQuiz && quizTasks.length > 0) {
    const task = quizTasks[currentQ];
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.quizHeader}>
          <TouchableOpacity onPress={() => { setInQuiz(false); setCurrentQ(0); setScore(0); setSelectedIndex(null); setAnswered(false); }}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.quizProgress}>{currentQ + 1} / {quizTasks.length}</Text>
          <Text style={styles.quizScore}>+{score}</Text>
        </View>
        <View style={styles.quizProgressBar}>
          <View style={[styles.quizProgressFill, { width: `${((currentQ + 1) / quizTasks.length) * 100}%` }]} />
        </View>
        <ScrollView style={styles.quizScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.quizQuestion}>{task?.question}</Text>
          {(task?.options || []).map((opt, i) => {
            const isSelected = selectedIndex === i;
            const isCorrect = i === task.correct_option;
            let bg = Colors.surface;
            let borderColor = Colors.border;
            if (answered) {
              if (isCorrect) { bg = Colors.greenBackground; borderColor = Colors.green; }
              else if (isSelected) { bg = 'rgba(239,68,68,0.1)'; borderColor = Colors.error; }
            }
            return (
              <TouchableOpacity
                key={i}
                style={[styles.answerBtn, { backgroundColor: bg, borderColor }]}
                onPress={() => handleAnswer(i)}
                disabled={answered}
                testID={`answer-${i}`}
              >
                <View style={[styles.answerLabel, answered && isCorrect && { backgroundColor: Colors.green }, answered && isSelected && !isCorrect && { backgroundColor: Colors.error }]}>
                  <Text style={styles.answerLabelText}>{['А', 'Б', 'В', 'Г'][i]}</Text>
                </View>
                <Text style={[styles.answerText, answered && isCorrect && { color: Colors.green, fontWeight: '700' }]}>{opt}</Text>
                {answered && isCorrect && <Ionicons name="checkmark-circle" size={20} color={Colors.green} />}
                {answered && isSelected && !isCorrect && <Ionicons name="close-circle" size={20} color={Colors.error} />}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.lessonHeader}>
        <TouchableOpacity onPress={() => router.back()} testID="back-button">
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.lessonHeaderTitle} numberOfLines={1}>{lesson?.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Video */}
        {isValidYouTube ? (
          <YoutubePlayer height={220} videoId={videoId} />
        ) : (
          <View style={styles.videoPlaceholder} testID="video-placeholder">
            <Ionicons name="videocam" size={48} color={Colors.primary} />
            <Text style={styles.videoPlaceholderText}>
              {videoId ? 'Видео недоступно' : 'Видео скоро будет добавлено'}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.lessonTitle}>{lesson?.title}</Text>
          {lesson?.description && (
            <Text style={styles.lessonDesc}>{lesson.description}</Text>
          )}

          <View style={styles.actions}>
            {quizTasks.length > 0 && (
              <TouchableOpacity
                style={styles.quizBtn}
                onPress={() => { setInQuiz(true); setCurrentQ(0); setScore(0); setSelectedIndex(null); setAnswered(false); setQuizDone(false); }}
                testID="start-quiz-button"
              >
                <Ionicons name="help-circle" size={20} color="#FFFFFF" />
                <Text style={styles.quizBtnText}>Пройти тест ({quizTasks.length} вопр.)</Text>
              </TouchableOpacity>
            )}
            {!lessonCompleted && quizTasks.length === 0 && (
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={async () => {
                  await completeLesson();
                  Alert.alert('Отлично!', 'Урок завершён. Следующий откроется через 3 дня.');
                  router.back();
                }}
                testID="complete-lesson-btn"
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.completeBtnText}>Завершить урок</Text>
              </TouchableOpacity>
            )}
            {lessonCompleted && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
                <Text style={styles.completedBadgeText}>Урок завершён</Text>
              </View>
            )}
            {lesson?.pdf_file_id && (
              <TouchableOpacity style={styles.pdfBtn}>
                <Ionicons name="document-text" size={20} color={Colors.primary} />
                <Text style={styles.pdfBtnText}>Открыть PDF</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: ReturnType<typeof useColors>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  lessonHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  lessonHeaderTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  scroll: { flex: 1 },
  videoPlaceholder: {
    backgroundColor: Colors.surface,
    height: 220, justifyContent: 'center', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8,
  },
  videoPlaceholderText: { fontSize: 16, color: Colors.textSecondary },
  content: { padding: 20 },
  lessonTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 12 },
  lessonDesc: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24, marginBottom: 24 },
  actions: { gap: 12 },
  quizBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary,
    borderRadius: 12, padding: 16, alignItems: 'center', gap: 10, ...Shadows.gold,
  },
  quizBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  completeBtn: {
    flexDirection: 'row', backgroundColor: Colors.green,
    borderRadius: 12, padding: 16, alignItems: 'center', gap: 10,
    justifyContent: 'center', ...Shadows.card,
  },
  completeBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  completedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.greenBackground, borderRadius: 12, padding: 16, gap: 8,
    borderWidth: 1, borderColor: Colors.green,
  },
  completedBadgeText: { fontSize: 16, fontWeight: '600', color: Colors.green },
  pdfBtn: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: 12, padding: 16, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: Colors.primaryBorder,
  },
  pdfBtnText: { fontSize: 16, color: Colors.primary },
  // Quiz
  quizHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  quizProgress: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  quizScore: { fontSize: 16, color: Colors.primary, fontWeight: 'bold' },
  quizProgressBar: { height: 4, backgroundColor: Colors.border, marginHorizontal: 20, borderRadius: 2 },
  quizProgressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  quizScroll: { flex: 1, paddingHorizontal: 20 },
  quizQuestion: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginVertical: 24, lineHeight: 30 },
  answerBtn: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: 16, marginBottom: 12, borderWidth: 2, gap: 12,
  },
  answerLabel: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center',
  },
  answerLabelText: { fontSize: 14, fontWeight: 'bold', color: Colors.textPrimary },
  answerText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  // Done
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 12 },
  doneScore: { fontSize: 22, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  donePlus: { fontSize: 18, color: Colors.green, fontWeight: '600', marginBottom: 32 },
  doneBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 16, ...Shadows.gold },
  doneBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
});
