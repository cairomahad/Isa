import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Shadows } from '../../constants/colors';

type Lesson = {
  id: string;
  title: string;
  description: string;
  video_url: string;
  course_type: string;
  order_num: number;
  is_locked: boolean;
  pdf_url?: string;
};

type QuizTask = {
  id: string;
  lesson_id: string;
  question: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  correct_answer: string;
};

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quizTasks, setQuizTasks] = useState<QuizTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [inQuiz, setInQuiz] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      try {
        const { data: l } = await supabase
          .from('video_lessons')
          .select('*')
          .eq('id', id)
          .single();
        setLesson(l || DEMO_LESSON);

        const { data: quiz } = await supabase
          .from('quiz_tasks')
          .select('*')
          .eq('lesson_id', id);
        setQuizTasks(quiz || []);
      } catch {
        setLesson(DEMO_LESSON);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    const task = quizTasks[currentQ];
    if (task && answer === task.correct_answer) {
      setScore((s) => s + 10);
    }
    setTimeout(() => {
      if (currentQ < quizTasks.length - 1) {
        setCurrentQ((q) => q + 1);
        setSelectedAnswer(null);
      } else {
        setQuizDone(true);
        // Save quiz result
        if (session?.user?.id && lesson?.id) {
          supabase.from('quiz_results').insert([{
            user_id: session.user.id,
            lesson_id: lesson.id,
            score: score + (answer === task?.correct_answer ? 10 : 0),
          }]);
          // Update user points
          supabase.rpc('increment_points', {
            user_app_id: session.user.id,
            amount: score + (answer === task?.correct_answer ? 10 : 0),
          }).then(() => {});
        }
      }
    }, 800);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (inQuiz && !quizDone) {
    const task = quizTasks[currentQ];
    const ANSWERS: Array<keyof QuizTask> = ['answer_a', 'answer_b', 'answer_c', 'answer_d'];
    const LABELS = ['А', 'Б', 'В', 'Г'];

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.quizHeader}>
          <TouchableOpacity onPress={() => setInQuiz(false)}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.quizProgress}>
            {currentQ + 1} / {quizTasks.length}
          </Text>
          <Text style={styles.quizScore}>⭐ {score}</Text>
        </View>
        <View style={styles.quizProgressBar}>
          <View style={[styles.quizProgressFill, { width: `${((currentQ + 1) / quizTasks.length) * 100}%` }]} />
        </View>
        <ScrollView style={styles.quizScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.quizQuestion}>{task?.question}</Text>
          {ANSWERS.map((key, i) => {
            const val = task?.[key] as string;
            if (!val) return null;
            const isSelected = selectedAnswer === LABELS[i];
            const isCorrect = task?.correct_answer === LABELS[i];
            let bg = Colors.cardDark;
            if (selectedAnswer) {
              if (isCorrect) bg = Colors.mediumGreen;
              else if (isSelected) bg = Colors.error;
            }
            return (
              <TouchableOpacity
                key={key}
                style={[styles.answerBtn, { backgroundColor: bg }]}
                onPress={() => !selectedAnswer && handleAnswer(LABELS[i])}
                disabled={!!selectedAnswer}
                testID={`answer-${LABELS[i]}`}
              >
                <View style={styles.answerLabel}>
                  <Text style={styles.answerLabelText}>{LABELS[i]}</Text>
                </View>
                <Text style={styles.answerText}>{val}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (quizDone) {
    const total = quizTasks.length * 10;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.doneEmoji}>{pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📖'}</Text>
          <Text style={styles.doneTitle}>Тест завершён!</Text>
          <Text style={styles.doneScore}>{score} / {total} очков</Text>
          <Text style={styles.donePct}>{pct}% правильных ответов</Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.doneBtnText}>Вернуться к урокам</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.lessonHeader}>
        <TouchableOpacity onPress={() => router.back()} testID="back-button">
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.lessonHeaderTitle} numberOfLines={1}>
          {lesson?.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Video Placeholder */}
        <View style={styles.videoPlaceholder} testID="video-placeholder">
          <Ionicons name="videocam" size={48} color={Colors.gold} />
          <Text style={styles.videoPlaceholderText}>Видеоурок</Text>
          <Text style={styles.videoPlaceholderSub}>
            {lesson?.video_url
              ? 'Нажмите для просмотра'
              : 'Видео скоро будет добавлено'}
          </Text>
          {lesson?.video_url && (
            <View style={styles.playBtn}>
              <Ionicons name="play" size={24} color={Colors.background} />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.lessonTitle}>{lesson?.title}</Text>
          {lesson?.description && (
            <Text style={styles.lessonDesc}>{lesson.description}</Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {quizTasks.length > 0 && (
              <TouchableOpacity
                style={styles.quizBtn}
                onPress={() => setInQuiz(true)}
                testID="start-quiz-button"
              >
                <Ionicons name="help-circle" size={20} color={Colors.background} />
                <Text style={styles.quizBtnText}>Пройти тест ({quizTasks.length} вопросов)</Text>
              </TouchableOpacity>
            )}

            {lesson?.pdf_url && (
              <TouchableOpacity style={styles.pdfBtn}>
                <Ionicons name="document-text" size={20} color={Colors.gold} />
                <Text style={styles.pdfBtnText}>Открыть PDF-материал</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const DEMO_LESSON: Lesson = {
  id: 'demo',
  title: 'Введение в фикх',
  description: 'Изучите основы исламского права (фикха). Этот урок охватывает базовые понятия, необходимые каждому мусульманину.',
  video_url: '',
  course_type: 'shafi',
  order_num: 1,
  is_locked: false,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkGreen,
  },
  lessonHeaderTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  scroll: { flex: 1 },
  videoPlaceholder: {
    backgroundColor: Colors.cardLight,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkGreen,
    gap: 8,
  },
  videoPlaceholderText: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
  videoPlaceholderSub: { fontSize: 13, color: Colors.textSecondary },
  playBtn: {
    marginTop: 8,
    backgroundColor: Colors.gold,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 20 },
  lessonTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 12 },
  lessonDesc: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24, marginBottom: 24 },
  actions: { gap: 12 },
  quizBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.gold,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  quizBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.background },
  pdfBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
  },
  pdfBtnText: { fontSize: 16, color: Colors.gold },
  // Quiz styles
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  quizProgress: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  quizScore: { fontSize: 16, color: Colors.gold, fontWeight: 'bold' },
  quizProgressBar: { height: 4, backgroundColor: Colors.darkGreen, marginHorizontal: 20, borderRadius: 2 },
  quizProgressFill: { height: 4, backgroundColor: Colors.gold, borderRadius: 2 },
  quizScroll: { flex: 1, paddingHorizontal: 20 },
  quizQuestion: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginVertical: 24, lineHeight: 30 },
  answerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    gap: 12,
  },
  answerLabel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.darkGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerLabelText: { fontSize: 14, fontWeight: 'bold', color: Colors.textPrimary },
  answerText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  // Done styles
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
  doneScore: { fontSize: 32, fontWeight: 'bold', color: Colors.gold, marginBottom: 8 },
  donePct: { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },
  doneBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  doneBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.background },
});
