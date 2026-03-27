import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Shadows } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

type PrayerType = 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha';

type MissedPrayers = {
  [key in PrayerType]: number;
};

const PRAYER_NAMES: Record<PrayerType, { name: string; emoji: string; color: string }> = {
  fajr: { name: 'Фаджр', emoji: '🌅', color: '#FF6B6B' },
  zuhr: { name: 'Зухр', emoji: '☀️', color: '#FFD93D' },
  asr: { name: 'Аср', emoji: '🌤️', color: '#FFA940' },
  maghrib: { name: 'Магриб', emoji: '🌆', color: '#FF7E67' },
  isha: { name: 'Иша', emoji: '🌙', color: '#6C5CE7' },
};

function PrayerCounter({
  type,
  count,
  onIncrement,
  onDecrement,
}: {
  type: PrayerType;
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const info = PRAYER_NAMES[type];

  return (
    <View style={styles.counterCard}>
      <View style={styles.counterHeader}>
        <Text style={styles.prayerEmoji}>{info.emoji}</Text>
        <View style={styles.prayerInfo}>
          <Text style={styles.prayerName}>{info.name}</Text>
          <Text style={styles.prayerCount}>{count} пропущено</Text>
        </View>
      </View>

      <View style={styles.counterControls}>
        <TouchableOpacity
          style={[styles.controlButton, styles.decrementButton]}
          onPress={onDecrement}
          disabled={count === 0}
        >
          <Ionicons name="remove" size={24} color={Colors.background} />
        </TouchableOpacity>

        <View style={styles.countDisplay}>
          <Text style={styles.countText}>{count}</Text>
        </View>

        <TouchableOpacity
          style={[styles.controlButton, styles.incrementButton]}
          onPress={onIncrement}
        >
          <Ionicons name="add" size={24} color={Colors.background} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MissedPrayersScreen() {
  const { user } = useAuthStore();
  const [missedPrayers, setMissedPrayers] = useState<MissedPrayers>({
    fajr: 0,
    zuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  });

  // Load saved data (would be from backend in production)
  useEffect(() => {
    // TODO: Load from backend
    const savedData = {
      fajr: 25,
      zuhr: 20,
      asr: 22,
      maghrib: 18,
      isha: 12,
    };
    setMissedPrayers(savedData);
  }, []);

  const totalMissed = Object.values(missedPrayers).reduce((sum, count) => sum + count, 0);

  const handleIncrement = (type: PrayerType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMissedPrayers({
      ...missedPrayers,
      [type]: missedPrayers[type] + 1,
    });
    // TODO: Save to backend
  };

  const handleDecrement = (type: PrayerType) => {
    if (missedPrayers[type] === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMissedPrayers({
      ...missedPrayers,
      [type]: missedPrayers[type] - 1,
    });
    // TODO: Save to backend
  };

  const handleResetAll = () => {
    Alert.alert(
      'Сбросить всё?',
      'Вы уверены, что хотите сбросить все счетчики? Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: () => {
            setMissedPrayers({
              fajr: 0,
              zuhr: 0,
              asr: 0,
              maghrib: 0,
              isha: 0,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // TODO: Save to backend
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Возмещение 🤲</Text>
        </View>

        {/* Total Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Всего пропущено</Text>
            <Text style={styles.summaryCount}>{totalMissed}</Text>
            <Text style={styles.summarySubtext}>намазов</Text>
          </View>
          <View style={styles.summaryIcon}>
            <Ionicons name="calendar-outline" size={40} color={Colors.gold} />
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.gold} />
          <Text style={styles.infoText}>
            Отмечайте возмещённые намазы, нажимая кнопку "-". Добавляйте пропущенные кнопкой "+".
          </Text>
        </View>

        {/* Prayer Counters */}
        <View style={styles.countersContainer}>
          {(Object.keys(PRAYER_NAMES) as PrayerType[]).map((type) => (
            <PrayerCounter
              key={type}
              type={type}
              count={missedPrayers[type]}
              onIncrement={() => handleIncrement(type)}
              onDecrement={() => handleDecrement(type)}
            />
          ))}
        </View>

        {/* Reset Button */}
        {totalMissed > 0 && (
          <TouchableOpacity style={styles.resetAllButton} onPress={handleResetAll}>
            <Ionicons name="refresh" size={20} color="#EF4444" />
            <Text style={styles.resetAllText}>Сбросить все счетчики</Text>
          </TouchableOpacity>
        )}

        {/* Motivation Card */}
        <View style={styles.motivationCard}>
          <Text style={styles.motivationEmoji}>💪</Text>
          <Text style={styles.motivationText}>
            "Поистине, намаз предписан верующим в определённое время" (Коран, 4:103)
          </Text>
          <Text style={styles.motivationSubtext}>
            Каждый возмещённый намаз приближает вас к Аллаху!
          </Text>
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
    paddingTop: 16,
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.gold },
  summaryCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  summaryCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.gold,
  },
  summarySubtext: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  summaryIcon: {
    opacity: 0.3,
  },
  infoCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    marginLeft: 10,
    lineHeight: 18,
  },
  countersContainer: {
    gap: 12,
  },
  counterCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  counterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  prayerEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  prayerCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  decrementButton: {
    backgroundColor: '#EF4444',
  },
  incrementButton: {
    backgroundColor: Colors.gold,
  },
  countDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  countText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.gold,
  },
  resetAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 8,
  },
  resetAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  motivationCard: {
    backgroundColor: Colors.mediumGreen,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  motivationEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  motivationSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
