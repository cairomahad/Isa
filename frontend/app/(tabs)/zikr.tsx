import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Shadows } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

type DhikrItem = {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  goal: number;
  reward_points: number;
};

const DAILY_DHIKR: DhikrItem[] = [
  {
    id: '1',
    arabic: 'سُبْحَانَ اللهِ',
    transliteration: 'Субханаллах',
    translation: 'Пречист Аллах',
    goal: 33,
    reward_points: 5,
  },
  {
    id: '2',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Альхамдулиллях',
    translation: 'Хвала Аллаху',
    goal: 33,
    reward_points: 5,
  },
  {
    id: '3',
    arabic: 'اللهُ أَكْبَرُ',
    transliteration: 'Аллаху Акбар',
    translation: 'Аллах Велик',
    goal: 34,
    reward_points: 5,
  },
  {
    id: '4',
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',
    transliteration: 'Ля иляха илляллах',
    translation: 'Нет божества, кроме Аллаха',
    goal: 100,
    reward_points: 10,
  },
  {
    id: '5',
    arabic: 'أَسْتَغْفِرُ اللهَ',
    transliteration: 'Астагфируллах',
    translation: 'Прошу прощения у Аллаха',
    goal: 100,
    reward_points: 10,
  },
];

function CircularProgress({ progress, size = 200 }: { progress: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressValue = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (progressValue / 100) * circumference;

  return (
    <View style={{ width: size, height: size, transform: [{ rotate: '-90deg' }] }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.darkGreen}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.gold}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export default function ZikrScreen() {
  const { user } = useAuthStore();
  const [selectedDhikr, setSelectedDhikr] = useState<DhikrItem>(DAILY_DHIKR[0]);
  const [count, setCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const progress = (count / selectedDhikr.goal) * 100;

  const handleTap = () => {
    if (count >= selectedDhikr.goal) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setCount(count + 1);

    // Check if goal reached
    if (count + 1 === selectedDhikr.goal) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTotalPoints(totalPoints + selectedDhikr.reward_points);
      
      // Pulse animation
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleReset = () => {
    setCount(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSelectDhikr = (dhikr: DhikrItem) => {
    setSelectedDhikr(dhikr);
    setCount(0);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Зикр 📿</Text>
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={16} color={Colors.gold} />
            <Text style={styles.pointsText}>{totalPoints}</Text>
          </View>
        </View>

        {/* Main Counter */}
        <View style={styles.counterContainer}>
          <View style={styles.circleContainer}>
            <CircularProgress progress={progress} size={220} />
            <Animated.View style={[styles.counterContent, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.countText}>{count}</Text>
              <Text style={styles.goalText}>из {selectedDhikr.goal}</Text>
            </Animated.View>
          </View>

          {/* Dhikr Text */}
          <View style={styles.dhikrTextContainer}>
            <Text style={styles.arabicText}>{selectedDhikr.arabic}</Text>
            <Text style={styles.transliterationText}>{selectedDhikr.transliteration}</Text>
            <Text style={styles.translationText}>{selectedDhikr.translation}</Text>
          </View>

          {/* Tap Button */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.tapButton, count >= selectedDhikr.goal && styles.tapButtonCompleted]}
              onPress={handleTap}
              disabled={count >= selectedDhikr.goal}
            >
              <Text style={styles.tapButtonText}>
                {count >= selectedDhikr.goal ? '✅ Завершено!' : '☝️ Тап для подсчёта'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Reset Button */}
          {count > 0 && (
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Ionicons name="refresh" size={20} color={Colors.gold} />
              <Text style={styles.resetButtonText}>Сбросить</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dhikr List */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Выберите зикр</Text>
          {DAILY_DHIKR.map((dhikr) => (
            <TouchableOpacity
              key={dhikr.id}
              style={[
                styles.dhikrCard,
                selectedDhikr.id === dhikr.id && styles.dhikrCardActive,
              ]}
              onPress={() => handleSelectDhikr(dhikr)}
            >
              <View style={styles.dhikrCardContent}>
                <Text style={styles.dhikrCardArabic}>{dhikr.arabic}</Text>
                <Text style={styles.dhikrCardTranslation}>{dhikr.translation}</Text>
                <Text style={styles.dhikrCardGoal}>Цель: {dhikr.goal}x</Text>
              </View>
              {selectedDhikr.id === dhikr.id && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.gold} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.gold },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  pointsText: { fontSize: 16, fontWeight: 'bold', color: Colors.gold, marginLeft: 4 },
  counterContainer: { alignItems: 'center', marginBottom: 32 },
  circleContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  counterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 56, fontWeight: 'bold', color: Colors.gold },
  goalText: { fontSize: 16, color: Colors.textSecondary, marginTop: 4 },
  dhikrTextContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  arabicText: {
    fontSize: 32,
    color: Colors.gold,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  transliterationText: {
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  translationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tapButton: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 250,
    alignItems: 'center',
    ...Shadows.card,
  },
  tapButtonCompleted: {
    backgroundColor: Colors.mediumGreen,
  },
  tapButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.background,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resetButtonText: {
    fontSize: 14,
    color: Colors.gold,
    marginLeft: 6,
  },
  listContainer: { marginTop: 20 },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gold,
    marginBottom: 12,
  },
  dhikrCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dhikrCardActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.mediumGreen,
  },
  dhikrCardContent: { flex: 1 },
  dhikrCardArabic: {
    fontSize: 20,
    color: Colors.gold,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dhikrCardTranslation: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  dhikrCardGoal: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
