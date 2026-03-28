import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, FlatList, RefreshControl, Switch, Alert,
} from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Shadows } from '../../constants/colors';
import { CITIES, PRAYER_NAMES, City } from '../../constants/cities';
import {
  requestNotificationPermissions,
  schedulePrayerNotifications,
  cancelAllPrayerNotifications,
  arePrayerNotificationsEnabled,
  sendTestNotification,
} from '../../services/notificationService';

type PrayerTimes = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
};

type MissedPrayers = {
  id?: string;
  fajr: number;
  zuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
};

const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const MISSED_KEYS: Array<keyof MissedPrayers> = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];
const MISSED_LABELS: Record<string, string> = {
  fajr: 'Фаджр', zuhr: 'Зухр', asr: 'Аср', maghrib: 'Магриб', isha: 'Иша',
};

function getNextPrayer(times: PrayerTimes): { name: string; time: string; minutesLeft: number } {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  for (const prayer of prayers) {
    const time = times[prayer as keyof PrayerTimes];
    if (!time) continue;
    const [h, m] = time.split(':').map(Number);
    const prayerMinutes = h * 60 + m;
    if (prayerMinutes > currentMinutes) {
      return {
        name: PRAYER_NAMES[prayer] || prayer,
        time,
        minutesLeft: prayerMinutes - currentMinutes,
      };
    }
  }
  return { name: 'Фаджр', time: times.Fajr || '05:00', minutesLeft: 0 };
}

export default function PrayersScreen() {
  const { session, selectedCity, setCity } = useAuthStore();
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [missed, setMissed] = useState<MissedPrayers>({ fajr: 0, zuhr: 0, asr: 0, maghrib: 0, isha: 0 });
  const [loading, setLoading] = useState(true);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Проверка статуса уведомлений при загрузке
  useEffect(() => {
    arePrayerNotificationsEnabled().then(setNotificationsEnabled);
  }, []);

  // Включение/выключение уведомлений
  const toggleNotifications = async (value: boolean) => {
    if (value) {
      // Запрос разрешения
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Разрешение отклонено',
          'Пожалуйста, разрешите уведомления в настройках телефона'
        );
        return;
      }

      // Планируем уведомления
      if (prayerTimes) {
        await schedulePrayerNotifications(prayerTimes);
        setNotificationsEnabled(true);
        Alert.alert('✅ Готово', 'Уведомления о намазе включены');
      }
    } else {
      // Отключаем уведомления
      await cancelAllPrayerNotifications();
      setNotificationsEnabled(false);
      Alert.alert('Выключено', 'Уведомления о намазе отключены');
    }
  };

  const loadPrayerTimes = useCallback(async (cityName?: string) => {
    const city = CITIES.find((c) => c.label === (cityName || selectedCity)) || CITIES[0];
    const cacheKey = `prayers_${city.label}_${new Date().toDateString()}`;

    try {
      // Try cache first
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setPrayerTimes(JSON.parse(cached));
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Call our Backend API
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mobile-debug-deploy.preview.emergentagent.com';
      const citySlug = city.slug || 'moscow'; // Используем slug из cities
      const url = `${backendUrl}/api/prayer-times?city=${citySlug}`;
      
      const res = await fetch(url);
      const json = await res.json();
      
      if (json && json.fajr) {
        // Преобразуем формат нашего API в формат компонента
        const timings = {
          Fajr: json.fajr,
          Sunrise: json.sunrise,
          Dhuhr: json.dhuhr,
          Asr: json.asr,
          Maghrib: json.maghrib,
          Isha: json.isha,
        };
        setPrayerTimes(timings);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(timings));
      }
    } catch (err) {
      console.warn('Prayer times error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCity]);

  const loadMissed = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('missed_prayers')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    if (data) setMissed(data);
  }, [session]);

  useEffect(() => {
    loadPrayerTimes();
    loadMissed();
  }, [loadPrayerTimes, loadMissed]);

  // Countdown timer
  useEffect(() => {
    if (!prayerTimes) return;
    const update = () => {
      const next = getNextPrayer(prayerTimes);
      const h = Math.floor(next.minutesLeft / 60);
      const m = next.minutesLeft % 60;
      setCountdown(`${h}ч ${m}м`);
    };
    update();
    timerRef.current = setInterval(update, 60000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [prayerTimes]);

  const selectCity = async (city: City) => {
    setCity(city.label);
    await AsyncStorage.setItem('selected_city', city.label);
    // Update in DB
    if (session?.user?.id) {
      await supabase.from('users').update({ city: city.label }).eq('app_user_id', session.user.id);
    }
    setCityModalVisible(false);
    setLoading(true);
    loadPrayerTimes(city.label);
  };

  const decrementMissed = async (key: keyof MissedPrayers) => {
    if (typeof missed[key] !== 'number' || (missed[key] as number) <= 0) return;
    const updated = { ...missed, [key]: (missed[key] as number) - 1 };
    setMissed(updated);
    if (!session?.user?.id) return;
    const { id, ...values } = updated;
    if (missed.id) {
      await supabase.from('missed_prayers').update(values).eq('id', missed.id);
    } else {
      const { data } = await supabase.from('missed_prayers')
        .upsert({ user_id: session.user.id, ...values })
        .select().single();
      if (data) setMissed(data);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPrayerTimes();
  };

  const nextPrayer = prayerTimes ? getNextPrayer(prayerTimes) : null;
  const totalMissed = MISSED_KEYS.reduce((sum, k) => sum + ((missed[k] as number) || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Намазы</Text>
          <TouchableOpacity
            style={styles.cityBtn}
            onPress={() => setCityModalVisible(true)}
            testID="city-selector"
          >
            <Ionicons name="location" size={16} color={Colors.gold} />
            <Text style={styles.cityName}>{selectedCity}</Text>
            <Ionicons name="chevron-down" size={14} color={Colors.gold} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.gold} size="large" />
          </View>
        ) : (
          <>
            {/* Notification Toggle */}
            <View style={styles.notificationCard}>
              <View style={styles.notificationLeft}>
                <Ionicons name="notifications" size={24} color={Colors.primary} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>Уведомления о намазе</Text>
                  <Text style={styles.notificationSubtitle}>
                    Напоминания за 5 минут до времени
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                thumbColor={notificationsEnabled ? Colors.primary : Colors.textSecondary}
              />
            </View>

            {/* Next Prayer Card */}
            {nextPrayer && (
              <View style={styles.nextCard} testID="next-prayer-card">
                <Text style={styles.nextLabel}>Следующий намаз</Text>
                <Text style={styles.nextName}>{nextPrayer.name}</Text>
                <Text style={styles.nextTime}>{nextPrayer.time}</Text>
                <View style={styles.countdownBadge}>
                  <Ionicons name="time" size={14} color={Colors.background} />
                  <Text style={styles.countdownText}>через {countdown}</Text>
                </View>
              </View>
            )}

            {/* Prayer Times */}
            <View style={styles.timesCard}>
              <Text style={styles.cardTitle}>Расписание намазов</Text>
              {prayerTimes && PRAYER_ORDER.map((name) => {
                const time = prayerTimes[name as keyof PrayerTimes];
                if (!time) return null;
                const isNext = nextPrayer?.name === PRAYER_NAMES[name];
                return (
                  <View key={name} style={[styles.prayerRow, isNext && styles.activeRow]}>
                    <Text style={[styles.prayerName, isNext && styles.activeName]}>
                      {PRAYER_NAMES[name] || name}
                    </Text>
                    <Text style={[styles.prayerTime, isNext && styles.activeTime]}>{time}</Text>
                  </View>
                );
              })}
            </View>

            {/* Missed Prayers */}
            <View style={styles.missedCard}>
              <View style={styles.missedHeader}>
                <Ionicons name="warning" size={18} color={Colors.gold} />
                <Text style={styles.missedTitle}>
                  Возмещение намазов
                </Text>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalText}>{totalMissed}</Text>
                </View>
              </View>
              {MISSED_KEYS.map((key) => (
                <View key={key} style={styles.missedRow}>
                  <Text style={styles.missedPrayer}>{MISSED_LABELS[key]}</Text>
                  <View style={styles.missedControls}>
                    <Text style={styles.missedCount}>{(missed[key] as number) || 0}</Text>
                    <TouchableOpacity
                      style={styles.decreBtn}
                      onPress={() => decrementMissed(key)}
                      testID={`decrement-${key}`}
                    >
                      <Text style={styles.decreText}>−1</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* City Modal */}
      <Modal visible={cityModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setCityModalVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите город</Text>
            <FlatList
              data={CITIES}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.cityItem, selectedCity === item.label && styles.cityItemActive]}
                  onPress={() => selectCity(item)}
                  testID={`city-${item.label}`}
                >
                  <Text style={[styles.cityItemText, selectedCity === item.label && styles.cityItemActiveText]}>
                    {item.label}
                  </Text>
                  {selectedCity === item.label && (
                    <Ionicons name="checkmark" size={18} color={Colors.gold} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, paddingHorizontal: 16 },
  center: { paddingVertical: 60, alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardDark,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    gap: 4,
  },
  cityName: { fontSize: 14, color: Colors.gold, marginHorizontal: 4 },
  nextCard: {
    backgroundColor: Colors.cardLight,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    ...Shadows.gold,
  },
  nextLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  nextName: { fontSize: 32, fontWeight: 'bold', color: Colors.gold, marginBottom: 4 },
  nextTime: { fontSize: 48, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 12 },
  countdownBadge: {
    flexDirection: 'row',
    backgroundColor: Colors.gold,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 4,
  },
  countdownText: { fontSize: 14, fontWeight: '600', color: Colors.background },
  
  // Notification card
  notificationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  
  timesCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.gold, marginBottom: 12 },
  prayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.darkGreen,
  },
  activeRow: { backgroundColor: `${Colors.gold}15`, borderRadius: 8, paddingHorizontal: 8 },
  prayerName: { fontSize: 15, color: Colors.textPrimary },
  activeName: { color: Colors.gold, fontWeight: '600' },
  prayerTime: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  activeTime: { color: Colors.gold, fontWeight: 'bold' },
  missedCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  missedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  missedTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.gold },
  totalBadge: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  totalText: { fontSize: 13, fontWeight: 'bold', color: Colors.background },
  missedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.darkGreen,
  },
  missedPrayer: { fontSize: 15, color: Colors.textPrimary },
  missedControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  missedCount: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary, minWidth: 30, textAlign: 'center' },
  decreBtn: {
    backgroundColor: Colors.mediumGreen,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  decreText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.cardDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderTopColor: Colors.darkGreen,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.gold, marginBottom: 16, textAlign: 'center' },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkGreen,
  },
  cityItemActive: { backgroundColor: `${Colors.gold}10`, borderRadius: 8, paddingHorizontal: 8 },
  cityItemText: { fontSize: 16, color: Colors.textPrimary },
  cityItemActiveText: { color: Colors.gold, fontWeight: '600' },
});
