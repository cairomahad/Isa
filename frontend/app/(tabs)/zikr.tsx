import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { VolumeManager } from 'react-native-volume-manager';
import { useColors } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { Shadows } from '../../constants/colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

type DhikrItem = {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  goal: number;
  reward_points: number;
  category?: string;
};

function CircularProgress({ progress, size = 200, color, trackColor }: { progress: number; size?: number; color: string; trackColor: string }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressValue = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (progressValue / 100) * circumference;
  return (
    <View style={{ width: size, height: size, transform: [{ rotate: '-90deg' }] }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export default function ZikrScreen() {
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [dhikrList, setDhikrList] = useState<DhikrItem[]>([]);
  const [selectedDhikr, setSelectedDhikr] = useState<DhikrItem | null>(null);
  const [count, setCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Throttle volume button taps to 100ms
  const lastVolumeTap = useRef(0);

  const progress = selectedDhikr ? (count / selectedDhikr.goal) * 100 : 0;

  const fetchZikr = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/zikr/list`);
      const data = await response.json();
      if (data.zikr_items && data.zikr_items.length > 0) {
        setDhikrList(data.zikr_items);
        setSelectedDhikr(prev => prev || data.zikr_items[0]);
      }
    } catch (error) {
      console.error('Error fetching zikr:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchZikr(); }, [fetchZikr]);

  useFocusEffect(useCallback(() => {
    fetchZikr();
    // Volume buttons — suppress system UI and use as zikr tap
    VolumeManager.showNativeVolumeUI({ enabled: false });

    const subscription = VolumeManager.addVolumeListener(() => {
      const now = Date.now();
      if (now - lastVolumeTap.current < 150) return; // throttle
      lastVolumeTap.current = now;
      handleTapFromVolume();
    });

    return () => {
      subscription.remove();
      VolumeManager.showNativeVolumeUI({ enabled: true });
    };
  }, [fetchZikr]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchZikr();
    setRefreshing(false);
  };

  const handleTapFromVolume = () => {
    // Access current state via ref pattern
    setCount(prev => {
      if (!selectedDhikr || prev >= selectedDhikr.goal) return prev;
      doTapAnimation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newCount = prev + 1;
      if (newCount === selectedDhikr.goal) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTotalPoints(tp => tp + selectedDhikr.reward_points);
        doPulseAnimation();
      }
      return newCount;
    });
  };

  const doTapAnimation = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const doPulseAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 300, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleTap = async () => {
    if (!selectedDhikr || count >= selectedDhikr.goal) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    doTapAnimation();
    const newCount = count + 1;
    setCount(newCount);

    if (newCount % 10 === 0 || newCount === selectedDhikr.goal) {
      try {
        await fetch(`${API_URL}/api/zikr/record`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user?.id, zikr_id: selectedDhikr.id, count: newCount }),
        });
      } catch {}
    }

    if (newCount === selectedDhikr.goal) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTotalPoints(tp => tp + selectedDhikr.reward_points);
      doPulseAnimation();
    }
  };

  const handleReset = () => {
    setCount(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const isCompleted = count >= selectedDhikr.goal;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Зикр</Text>
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={16} color={Colors.primary} />
            <Text style={styles.pointsText}>{totalPoints}</Text>
          </View>
        </View>

        {/* Counter */}
        <View style={styles.counterContainer}>
          <View style={styles.circleContainer}>
            <CircularProgress progress={progress} size={220} color={Colors.primary} trackColor={Colors.primaryBorder} />
            <Animated.View style={[styles.counterContent, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.countText}>{count}</Text>
              <Text style={styles.goalText}>из {selectedDhikr.goal}</Text>
            </Animated.View>
          </View>

          {/* Dhikr Text */}
          <View style={styles.dhikrTextContainer}>
            {!!selectedDhikr.arabic && <Text style={styles.arabicText}>{selectedDhikr.arabic}</Text>}
            {!!selectedDhikr.transliteration && <Text style={styles.transliterationText}>{selectedDhikr.transliteration}</Text>}
            <Text style={styles.translationText}>{selectedDhikr.translation}</Text>
          </View>

          {/* Tap Button — minimal, no text hint */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.tapButton, isCompleted && styles.tapButtonCompleted]}
              onPress={handleTap}
              disabled={isCompleted}
              activeOpacity={0.7}
              testID="zikr-tap-button"
            >
              {isCompleted
                ? <Ionicons name="checkmark-circle" size={48} color="#FFFFFF" />
                : <View style={styles.tapButtonInner} />
              }
            </TouchableOpacity>
          </Animated.View>

          {/* Reset */}
          {count > 0 && (
            <TouchableOpacity style={styles.resetButton} onPress={handleReset} testID="zikr-reset-button">
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
              style={[styles.dhikrCard, selectedDhikr.id === dhikr.id && styles.dhikrCardActive]}
              onPress={() => { setSelectedDhikr(dhikr); setCount(0); }}
            >
              <View style={styles.dhikrCardContent}>
                {!!dhikr.arabic && <Text style={styles.dhikrCardArabic}>{dhikr.arabic}</Text>}
                <Text style={styles.dhikrCardTranslation}>{dhikr.translation}</Text>
                <Text style={styles.dhikrCardGoal}>Цель: {dhikr.goal}x</Text>
              </View>
              {selectedDhikr.id === dhikr.id && <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, marginBottom: 28 },
  title: { fontSize: 30, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 4 },
  pointsText: { fontSize: 17, fontWeight: '700', color: Colors.primary, marginLeft: 4 },
  counterContainer: { alignItems: 'center', marginBottom: 36 },
  circleContainer: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  counterContent: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 56, fontWeight: '300', color: Colors.primary, letterSpacing: -2 },
  goalText: { fontSize: 16, color: Colors.textSecondary, marginTop: 6, fontWeight: '500' },
  dhikrTextContainer: { alignItems: 'center', marginBottom: 32, paddingHorizontal: 20 },
  arabicText: { fontSize: 32, color: Colors.primary, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  transliterationText: { fontSize: 18, color: Colors.textPrimary, marginBottom: 8, textAlign: 'center', fontWeight: '600' },
  translationText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', fontWeight: '400' },
  tapButton: {
    backgroundColor: Colors.primary,
    width: 140, height: 140, borderRadius: 70,
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.hero,
  },
  tapButtonCompleted: { backgroundColor: Colors.greenLight },
  tapButtonInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.3)' },
  resetButton: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingVertical: 10, paddingHorizontal: 20 },
  resetButtonText: { fontSize: 15, color: Colors.textSecondary, marginLeft: 6, fontWeight: '600' },
  listContainer: { marginTop: 28, paddingBottom: 24 },
  listTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  dhikrCard: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...Shadows.card },
  dhikrCardActive: { backgroundColor: Colors.greenBackground, borderLeftWidth: 3, borderLeftColor: Colors.green, ...Shadows.cardMedium },
  dhikrCardContent: { flex: 1 },
  dhikrCardArabic: { fontSize: 20, color: Colors.primary, fontWeight: '700', marginBottom: 6 },
  dhikrCardTranslation: { fontSize: 15, color: Colors.textPrimary, marginBottom: 4, fontWeight: '500' },
  dhikrCardGoal: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
});
