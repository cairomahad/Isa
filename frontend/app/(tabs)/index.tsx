import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
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
};

type CourseGroup = {
  type: string;
  label: string;
  emoji: string;
  lessons: Lesson[];
  progress: number;
  total: number;
  completed: number;
};

const COURSE_LABELS: Record<string, { label: string; emoji: string }> = {
  shafi: { label: 'Шафиитский мазхаб', emoji: '📘' },
  hanafi: { label: 'Ханафитский мазхаб', emoji: '📗' },
  arabic: { label: 'Арабский язык', emoji: '🔤' },
  family: { label: 'Семейные отношения', emoji: '🏠' },
  general: { label: 'Обязательные знания', emoji: '📚' },
};

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${value}%` }]} />
    </View>
  );
}

export default function LessonsScreen() {
  const router = useRouter();
  const { session, user } = useAuthStore();
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLessons = useCallback(async () => {
    try {
      const { data: lessons } = await supabase
        .from('video_lessons')
        .select('*')
        .order('order_num');

      if (!lessons || lessons.length === 0) {
        // Show demo data
        setCourseGroups(DEMO_COURSES);
        return;
      }

      // Group by course_type
      const groups: Record<string, Lesson[]> = {};
      lessons.forEach((l: Lesson) => {
        const type = l.course_type || 'general';
        if (!groups[type]) groups[type] = [];
        groups[type].push(l);
      });

      // Get user progress
      let progressMap: Record<string, string> = {};
      if (session?.user?.id) {
        const { data: progress } = await supabase
          .from('course_progress')
          .select('lesson_id, status')
          .eq('user_id', session.user.id);
        if (progress) {
          progress.forEach((p: any) => {
            progressMap[p.lesson_id] = p.status;
          });
        }
      }

      const result: CourseGroup[] = Object.entries(groups).map(([type, lessonList]) => {
        const completed = lessonList.filter(
          (l) => progressMap[l.id] === 'completed'
        ).length;
        const info = COURSE_LABELS[type] || { label: type, emoji: '📚' };
        return {
          type,
          label: info.label,
          emoji: info.emoji,
          lessons: lessonList,
          total: lessonList.length,
          completed,
          progress: lessonList.length > 0 ? Math.round((completed / lessonList.length) * 100) : 0,
        };
      });

      setCourseGroups(result);
    } catch (err) {
      console.warn(err);
      setCourseGroups(DEMO_COURSES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLessons();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Ассаляму алейкум,</Text>
          <Text style={styles.name}>{user?.display_name || 'Студент'} 👋</Text>
        </View>

        {/* Title */}
        <Text style={styles.sectionTitle}>Мои курсы</Text>

        {/* Courses */}
        {courseGroups.map((group) => (
          <View key={group.type} style={styles.courseCard} testID={`course-${group.type}`}>
            <View style={styles.courseHeader}>
              <Text style={styles.courseEmoji}>{group.emoji}</Text>
              <View style={styles.courseInfo}>
                <Text style={styles.courseLabel}>{group.label}</Text>
                <Text style={styles.courseProgress}>
                  {group.completed} из {group.total} уроков · {group.progress}%
                </Text>
              </View>
            </View>
            <ProgressBar value={group.progress} />

            {/* Lessons list */}
            {group.lessons.slice(0, 4).map((lesson, idx) => (
              <TouchableOpacity
                key={lesson.id}
                style={styles.lessonRow}
                onPress={() => router.push(`/lesson/${lesson.id}`)}
                testID={`lesson-${lesson.id}`}
              >
                <View style={[styles.lessonNum, lesson.is_locked && styles.lockedNum]}>
                  {lesson.is_locked ? (
                    <Ionicons name="lock-closed" size={12} color={Colors.textSecondary} />
                  ) : (
                    <Text style={styles.lessonNumText}>{idx + 1}</Text>
                  )}
                </View>
                <Text style={[styles.lessonTitle, lesson.is_locked && styles.lockedText]}>
                  {lesson.title}
                </Text>
                <Ionicons
                  name={lesson.is_locked ? 'lock-closed' : 'play-circle'}
                  size={20}
                  color={lesson.is_locked ? Colors.textSecondary : Colors.gold}
                />
              </TouchableOpacity>
            ))}

            {group.lessons.length > 4 && (
              <TouchableOpacity style={styles.moreBtn}>
                <Text style={styles.moreBtnText}>Все уроки ({group.lessons.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const DEMO_COURSES: CourseGroup[] = [
  {
    type: 'shafi',
    label: 'Шафиитский мазхаб',
    emoji: '📘',
    completed: 3,
    total: 12,
    progress: 25,
    lessons: [
      { id: '1', title: 'Введение в фикх', description: '', video_url: '', course_type: 'shafi', order_num: 1, is_locked: false },
      { id: '2', title: 'Основы тахарата', description: '', video_url: '', course_type: 'shafi', order_num: 2, is_locked: false },
      { id: '3', title: 'Виды воды', description: '', video_url: '', course_type: 'shafi', order_num: 3, is_locked: false },
      { id: '4', title: 'Условия намаза', description: '', video_url: '', course_type: 'shafi', order_num: 4, is_locked: false },
    ],
  },
  {
    type: 'arabic',
    label: 'Арабский язык',
    emoji: '🔤',
    completed: 0,
    total: 8,
    progress: 0,
    lessons: [
      { id: '5', title: 'Введение в арабский', description: '', video_url: '', course_type: 'arabic', order_num: 1, is_locked: true },
    ],
  },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 16, marginBottom: 20 },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  name: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.gold, marginBottom: 16 },
  courseCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    ...Shadows.card,
  },
  courseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  courseEmoji: { fontSize: 28, marginRight: 12 },
  courseInfo: { flex: 1 },
  courseLabel: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  courseProgress: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.darkGreen,
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.darkGreen,
  },
  lessonNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.mediumGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lockedNum: { backgroundColor: Colors.cardDark, borderWidth: 1, borderColor: Colors.darkGreen },
  lessonNumText: { fontSize: 12, color: Colors.textPrimary, fontWeight: 'bold' },
  lessonTitle: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  lockedText: { color: Colors.textSecondary },
  moreBtn: { alignItems: 'center', paddingTop: 10 },
  moreBtnText: { color: Colors.gold, fontSize: 14 },
});
