import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Shadows } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { REACT_APP_BACKEND_URL } from '@env';

const API_URL = REACT_APP_BACKEND_URL;

type DhikrItem = {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  goal: number;
  reward_points: number;
  category?: string;
};

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
          stroke={Colors.primaryBorder}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.primary}
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
  const [dhikrList, setDhikrList] = useState<DhikrItem[]>([]);
  const [selectedDhikr, setSelectedDhikr] = useState<DhikrItem | null>(null);
  const [count, setCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const progress = selectedDhikr ? (count / selectedDhikr.goal) * 100 : 0;

  // Fetch zikr from API
  useEffect(() => {
    fetchZikr();
  }, []);

  const fetchZikr = async () => {
    try {
      const response = await fetch(`${API_URL}/api/zikr/list`);
      const data = await response.json();
      if (data.zikr_items && data.zikr_items.length > 0) {
        setDhikrList(data.zikr_items);
        setSelectedDhikr(data.zikr_items[0]);
      }
    } catch (error) {
      console.error('Error fetching zikr:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchZikr();
    setRefreshing(false);
  };

  const handleTap = async () => {
    if (!selectedDhikr || count >= selectedDhikr.goal) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();

    const newCount = count + 1;
    setCount(newCount);

    // Save to backend periodically
    if (newCount % 10 === 0 || newCount === selectedDhikr.goal) {
      try {
        await fetch(`${API_URL}/api/zikr/record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.user_id,
            zikr_id: selectedDhikr.id,
            count: newCount,
          }),
        });
      } catch (error) {
        console.error('Error saving zikr progress:', error);
      }
    }

    // Check if goal reached
    if (newCount === selectedDhikr.goal) {
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Загрузка зикров...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedDhikr) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Нет доступных зикров</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Зикр 📿</Text>
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={16} color={Colors.primary} />
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

          {/* Tap Button - УЛУЧШЕННАЯ КНОПКА */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.tapButton, count >= selectedDhikr.goal && styles.tapButtonCompleted]}
              onPress={handleTap}
              disabled={count >= selectedDhikr.goal}
              activeOpacity={0.7}
            >
              <View style={styles.tapButtonInner}>
                <Text style={styles.tapButtonEmoji}>
                  {count >= selectedDhikr.goal ? '✅' : '☝️'}
                </Text>
                <Text style={styles.tapButtonText}>
                  {count >= selectedDhikr.goal ? 'Завершено!' : 'Нажмите здесь'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Reset Button */}
          {count > 0 && (
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
              <Text style={styles.resetButtonText}>Сбросить</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dhikr List */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Выберите зикр</Text>
          {dhikrList.map((dhikr) => (
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
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
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
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    marginBottom: 28,
  },
  title: { fontSize: 30, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  pointsText: { fontSize: 17, fontWeight: '700', color: Colors.primary, marginLeft: 4 },
  
  // Counter
  counterContainer: { alignItems: 'center', marginBottom: 36 },
  circleContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  counterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 56, fontWeight: '300', color: Colors.primary, letterSpacing: -2 },
  goalText: { fontSize: 16, color: Colors.textSecondary, marginTop: 6, fontWeight: '500' },
  
  // Dhikr Text
  dhikrTextContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  arabicText: {
    fontSize: 32,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },
  transliterationText: {
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  translationText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '400',
  },
  
  // Tap Button - УЛУЧШЕННЫЙ СТИЛЬ
  tapButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 24,
    borderRadius: 60,
    minWidth: 280,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.hero,
  },
  tapButtonCompleted: {
    backgroundColor: Colors.greenLight,
  },
  tapButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapButtonEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  tapButtonText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  
  // Reset Button
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  resetButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginLeft: 6,
    fontWeight: '600',
  },
  
  // Dhikr List
  listContainer: { marginTop: 28, paddingBottom: 24 },
  listTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  dhikrCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  dhikrCardActive: {
    backgroundColor: Colors.greenBackground,
    borderLeftWidth: 3,
    borderLeftColor: Colors.green,
    ...Shadows.cardMedium,
  },
  dhikrCardContent: { flex: 1 },
  dhikrCardArabic: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: 6,
  },
  dhikrCardTranslation: {
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 4,
    fontWeight: '500',
  },
  dhikrCardGoal: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
