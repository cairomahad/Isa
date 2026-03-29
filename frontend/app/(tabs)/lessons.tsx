import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

type Lesson = {
  id: string;
  title: string;
  description: string;
  video_url?: string;
  audio_url?: string;
  pdf_url?: string;
  course_type: string;
  order_num: number;
  is_locked: boolean;
  duration?: string;
};

type CourseGroup = {
  type: string;
  label: string;
  emoji: string;
  lessons: Lesson[];
  completed: number;
  total: number;
  progress: number;
};

const COURSE_TYPES: Record<string, { label: string; emoji: string; description: string }> = {
  fard_shafi: { label: 'Шафиитский мазхаб', emoji: '📘', description: 'Обязательные знания для всех' },
  fard_hanafi: { label: 'Ханафитский мазхаб', emoji: '📗', description: 'Обязательные знания для всех' },
  arab: { label: 'Арабский язык', emoji: '🔤', description: 'Открывается после основных знаний' },
  family: { label: 'Семейные отношения', emoji: '🏠', description: 'Открывается после основных знаний' },
  // Legacy aliases
  fard: { label: 'Шафиитский мазхаб', emoji: '📘', description: 'Обязательные знания для всех' },
  hanafi: { label: 'Ханафитский мазхаб', emoji: '📗', description: 'Обязательные знания для всех' },
  arabic: { label: 'Арабский язык', emoji: '🔤', description: 'Открывается после основных знаний' },
};

function ProgressBar({ value, Colors }: { value: number; Colors: any }) {
  return (
    <View style={{ height: 8, backgroundColor: Colors.backgroundPage, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
      <View style={{ height: 8, backgroundColor: Colors.primary, borderRadius: 4, width: `${Math.min(value, 100)}%` as any }} />
    </View>
  );
}

export default function LessonsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLessons();
  }, []);

  useFocusEffect(useCallback(() => { fetchLessons(); }, []));

  const fetchLessons = async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';
      const response = await fetch(`${backendUrl}/api/lessons?user_id=${user?.id || 'demo'}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch lessons');
      }
      
      const data = await response.json();
      
      if (data.courses && Array.isArray(data.courses)) {
        setCourseGroups(data.courses);
      } else {
        // Demo data если backend не готов
        setCourseGroups(DEMO_COURSES);
      }
    } catch (error) {
      console.warn('Error fetching lessons:', error);
      setCourseGroups(DEMO_COURSES);
    } finally {
      setLoading(false);
    }
  };

  const handleLessonPress = (lesson: Lesson) => {
    if (lesson.is_locked) {
      Alert.alert(
        'Урок заблокирован 🔒',
        'Этот урок откроется автоматически через 3 дня после предыдущего.',
        [{ text: 'Понятно' }]
      );
      return;
    }
    router.push(`/lesson/${lesson.id}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Видео Уроки 📚</Text>
          <Text style={styles.subtitle}>Учитесь в своем темпе</Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={Colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoText}>
              Новый урок открывается каждые 3 дня после завершения предыдущего
            </Text>
          </View>
        </View>

        {/* Course Groups */}
        {courseGroups.map((group) => (
          <View key={group.type} style={styles.courseCard}>
            {/* Course Header */}
            <View style={styles.courseHeader}>
              <Text style={styles.courseEmoji}>{group.emoji}</Text>
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle}>{group.label}</Text>
                <Text style={styles.courseSubtitle}>
                  {group.completed} из {group.total} уроков
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <ProgressBar value={group.progress} Colors={Colors} />
            <Text style={styles.progressText}>{group.progress}% завершено</Text>

            {/* Lessons */}
            <View style={styles.lessonsList}>
              {group.lessons.map((lesson, idx) => (
                <TouchableOpacity
                  key={lesson.id}
                  style={styles.lessonItem}
                  onPress={() => handleLessonPress(lesson)}
                  disabled={lesson.is_locked}
                >
                  <View style={[
                    styles.lessonIcon,
                    lesson.is_locked && styles.lessonIconLocked
                  ]}>
                    {lesson.is_locked ? (
                      <Ionicons name="lock-closed" size={16} color={Colors.textSecondary} />
                    ) : (
                      <Text style={styles.lessonNumber}>{idx + 1}</Text>
                    )}
                  </View>

                  <View style={styles.lessonContent}>
                    <Text style={[
                      styles.lessonTitle,
                      lesson.is_locked && styles.lessonTitleLocked
                    ]}>
                      {lesson.title}
                    </Text>
                    {lesson.duration && (
                      <Text style={styles.lessonDuration}>
                        <Ionicons name="time-outline" size={12} /> {lesson.duration}
                      </Text>
                    )}
                  </View>

                  <Ionicons
                    name={lesson.is_locked ? 'lock-closed' : 'play-circle'}
                    size={24}
                    color={lesson.is_locked ? Colors.textSecondary : Colors.primary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* View All Button */}
            {group.lessons.length > 5 && (
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>
                  Показать все ({group.total} уроков)
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Demo Data
const DEMO_COURSES: CourseGroup[] = [
  {
    type: 'fard_shafi',
    label: 'Шафиитский мазхаб',
    emoji: '📘',
    completed: 3, total: 12, progress: 25,
    lessons: [
      { id: '1', title: 'Введение в фикх', description: '', course_type: 'fard_shafi', order_num: 1, is_locked: false, duration: '12:30' },
      { id: '2', title: 'Основы тахарата', description: '', course_type: 'fard_shafi', order_num: 2, is_locked: false, duration: '15:20' },
    ],
  },
];

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1, paddingHorizontal: 20 },
  header: { paddingTop: 24, marginBottom: 20 },
  title: { fontSize: 30, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },
  infoCard: { flexDirection: 'row', backgroundColor: Colors.greenBackground, borderRadius: 16, padding: 16, marginBottom: 24, borderLeftWidth: 3, borderLeftColor: Colors.green },
  infoContent: { flex: 1, marginLeft: 12 },
  infoText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  courseCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginBottom: 20, ...Shadows.card },
  courseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  courseEmoji: { fontSize: 36, marginRight: 14 },
  courseInfo: { flex: 1 },
  courseTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  courseSubtitle: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  progressTrack: { height: 8, backgroundColor: Colors.backgroundPage, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  progressText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', marginBottom: 16 },
  lessonsList: { gap: 12 },
  lessonItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: Colors.backgroundPage, borderRadius: 12 },
  lessonIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  lessonIconLocked: { backgroundColor: Colors.border },
  lessonNumber: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  lessonContent: { flex: 1 },
  lessonTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  lessonTitleLocked: { color: Colors.textSecondary },
  lessonDuration: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 8, gap: 6 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
