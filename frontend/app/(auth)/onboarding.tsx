import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions,
} from 'react-native';
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'book' as const,
    title: 'Уроки по Исламу',
    subtitle: 'Видеоуроки по фикху, акыде и арабскому языку. Новый урок каждые 3 дня с тестами и домашними заданиями.',
    color: '#2D6A4F',
  },
  {
    id: '2',
    icon: 'moon' as const,
    title: 'Время намазов',
    subtitle: 'Расписание намазов для вашего города. Учёт пропущенных намазов и их возмещение.',
    color: '#1B4332',
  },
  {
    id: '3',
    icon: 'library' as const,
    title: 'Хадисы и знания',
    subtitle: 'Хадис, история и польза каждый день. Зикр со счётчиком и вопросы шейху.',
    color: '#0D2818',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      listRef.current?.scrollToIndex({ index: next });
      setCurrentIndex(next);
    } else {
      router.replace('/(tabs)');
    }
  };

  const skip = () => router.replace('/(tabs)');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Skip */}
        <TouchableOpacity style={styles.skip} onPress={skip} testID="skip-onboarding">
          <Text style={styles.skipText}>Пропустить</Text>
        </TouchableOpacity>

        {/* Slides */}
        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={64} color={Colors.gold} />
              </View>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
            </View>
          )}
        />

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* Next Button */}
        <TouchableOpacity style={styles.button} onPress={goNext} testID="next-slide-button">
          <Text style={styles.buttonText}>
            {currentIndex === SLIDES.length - 1 ? 'Начать' : 'Далее'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.background} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, alignItems: 'center' },
  skip: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  skipText: { color: Colors.textSecondary, fontSize: 15 },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    flex: 1,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.gold,
    textAlign: 'center',
    marginBottom: 16,
  },
  slideSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: { flexDirection: 'row', marginBottom: 32 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.darkGreen,
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: Colors.gold, width: 24 },
  button: {
    flexDirection: 'row',
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonText: { fontSize: 17, fontWeight: 'bold', color: Colors.background },
});
