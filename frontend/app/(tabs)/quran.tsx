import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

type QuranProgram = {
  has_program: boolean;
  current_surah: number;
  current_ayah: number;
  study_week: number;
  learned_count: number;
  reviews_due_today: number;
};

type Surah = {
  number: number;
  name: string;
  name_ar: string;
  ayahs: number;
};

type Review = {
  id: string;
  surah: number;
  ayah: number;
  surah_name: string;
  review_number: number;
};

export default function QuranScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<QuranProgram | null>(null);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showSurahSelector, setShowSurahSelector] = useState(false);
  const [acting, setActing] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001';
      
      // Fetch surahs
      const surahsRes = await fetch(`${backendUrl}/api/quran/surahs`);
      const surahsData = await surahsRes.json();
      setSurahs(surahsData.surahs || []);
      
      // Fetch program
      const programRes = await fetch(`${backendUrl}/api/quran/program?user_id=${user?.id}`);
      const programData = await programRes.json();
      setProgram(programData);
      
      // Fetch reviews if program exists
      if (programData.has_program) {
        const reviewsRes = await fetch(`${backendUrl}/api/quran/reviews-today?user_id=${user?.id}`);
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData.reviews || []);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };
  
  const startProgram = async (surahNumber: number) => {
    setActing(true);
    
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001';
      const response = await fetch(`${backendUrl}/api/quran/start-program`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, surah_number: surahNumber }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start program');
      }
      
      Alert.alert('Успешно!', 'Программа изучения Корана запущена');
      setShowSurahSelector(false);
      fetchData();
      
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось запустить программу');
    } finally {
      setActing(false);
    }
  };
  
  const learnAyah = async () => {
    if (!program) return;
    
    setActing(true);
    
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001';
      const response = await fetch(`${backendUrl}/api/quran/learn-ayah`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          surah: program.current_surah,
          ayah: program.current_ayah,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Отлично! ✅', data.message);
        fetchData();
      }
      
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить');
    } finally {
      setActing(false);
    }
  };
  
  const reviewAyah = async (review: Review) => {
    setActing(true);
    
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001';
      const response = await fetch(`${backendUrl}/api/quran/review-ayah`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          surah: review.surah,
          ayah: review.ayah,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Молодец! ✅', data.message);
        fetchData();
      }
      
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить');
    } finally {
      setActing(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  
  if (!program?.has_program) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.center}>
          <Text style={styles.icon}>📖</Text>
          <Text style={styles.welcomeTitle}>Программа изучения Корана</Text>
          <Text style={styles.welcomeSubtitle}>
            Учите Коран по системе интервальных повторений:{'\n'}
            1 день → 3 дня → 7 дней → 14 дней
          </Text>
          
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setShowSurahSelector(true)}
          >
            <Text style={styles.startButtonText}>Начать изучение</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          
          {showSurahSelector && (
            <View style={styles.surahSelector}>
              <Text style={styles.selectorTitle}>Выберите суру для начала:</Text>
              
              <ScrollView style={styles.surahList}>
                {surahs.map((surah) => (
                  <TouchableOpacity
                    key={surah.number}
                    style={styles.surahItem}
                    onPress={() => startProgram(surah.number)}
                    disabled={acting}
                  >
                    <Text style={styles.surahNumber}>{surah.number}</Text>
                    <View style={styles.surahInfo}>
                      <Text style={styles.surahName}>{surah.name}</Text>
                      <Text style={styles.surahArabic}>{surah.name_ar}</Text>
                    </View>
                    <Text style={styles.ayahCount}>{surah.ayahs} аятов</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSurahSelector(false)}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  const currentSurah = surahs.find(s => s.number === program.current_surah);
  
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Программа Корана 📖</Text>
          <Text style={styles.subtitle}>
            Неделя {program.study_week} • Выучено: {program.learned_count}
          </Text>
        </View>
        
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{program.learned_count}</Text>
            <Text style={styles.statLabel}>Выучено аятов</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{program.reviews_due_today}</Text>
            <Text style={styles.statLabel}>На повторение</Text>
          </View>
        </View>
        
        {/* Evening Lesson */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🌙 Вечерний урок
          </Text>
          
          <View style={styles.lessonCard}>
            <View style={styles.lessonHeader}>
              <Text style={styles.lessonSurah}>
                {currentSurah?.name} ({currentSurah?.name_ar})
              </Text>
              <Text style={styles.lessonAyah}>
                Аят {program.current_ayah}/{currentSurah?.ayahs}
              </Text>
            </View>
            
            <Text style={styles.lessonHint}>
              Прочитайте аят вслух несколько раз, повторяя за преподавателем
            </Text>
            
            <TouchableOpacity
              style={[styles.actionButton, acting && styles.actionButtonDisabled]}
              onPress={learnAyah}
              disabled={acting}
            >
              {acting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Я выучил этот аят</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Morning Reviews */}
        {reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ☀️ Утреннее повторение ({reviews.length})
            </Text>
            
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewSurah}>
                    {review.surah_name}, аят {review.ayah}
                  </Text>
                  <View style={styles.reviewBadge}>
                    <Text style={styles.reviewBadgeText}>
                      Повтор {review.review_number}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity
                  style={[styles.reviewButton, acting && styles.actionButtonDisabled]}
                  onPress={() => reviewAyah(review)}
                  disabled={acting}
                >
                  <Text style={styles.reviewButtonText}>Я повторил</Text>
                  <Ionicons name="checkmark" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  scroll: { flex: 1 },
  
  icon: { fontSize: 80, marginBottom: 24 },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
    ...Shadows.gold,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  surahSelector: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    padding: 20,
  },
  selectorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  surahList: {
    flex: 1,
    marginBottom: 16,
  },
  surahItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundPage,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  surahNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    width: 40,
  },
  surahInfo: {
    flex: 1,
    marginLeft: 12,
  },
  surahName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  surahArabic: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ayahCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cancelButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  header: {
    padding: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Shadows.card,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  
  lessonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    ...Shadows.card,
  },
  lessonHeader: {
    marginBottom: 16,
  },
  lessonSurah: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  lessonAyah: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  lessonHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    ...Shadows.gold,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewSurah: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  reviewBadge: {
    backgroundColor: Colors.greenBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.green,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenBackground,
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  reviewButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.green,
  },
});
