import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Colors, Shadows } from '../../constants/colors';

const DAILY_VERSE = {
  arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
  translation: 'Поистине, вместе с трудностью приходит лёгкость',
  reference: 'Коран 94:6',
};

export default function HomeScreen() {
  const router = useRouter();
  const { session, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextPrayer, setNextPrayer] = useState({ name: 'Зухр', time: '13:24', timeLeft: '2ч 15м' });
  const [userPoints, setUserPoints] = useState(740);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Refresh data
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ас-саляму алейкум,</Text>
            <Text style={styles.name}>{user?.display_name || 'Брат'} 👋</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={18} color={Colors.gold} />
            <Text style={styles.pointsText}>{userPoints}</Text>
          </View>
        </View>

        {/* Next Prayer Card */}
        <View style={styles.nextPrayerCard}>
          <View style={styles.nextPrayerHeader}>
            <Ionicons name="alarm" size={24} color={Colors.gold} />
            <Text style={styles.nextPrayerTitle}>Следующий намаз</Text>
          </View>
          <Text style={styles.nextPrayerName}>{nextPrayer.name}</Text>
          <Text style={styles.nextPrayerTime}>{nextPrayer.time}</Text>
          <View style={styles.timeLeftBadge}>
            <Text style={styles.timeLeftText}>через {nextPrayer.timeLeft}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/zikr')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="bead-outline" size={28} color={Colors.gold} />
            </View>
            <Text style={styles.actionText}>Зикр</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/missed-prayers')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="calendar" size={28} color={Colors.gold} />
            </View>
            <Text style={styles.actionText}>Возмещение</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/qa')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="chatbubbles" size={28} color={Colors.gold} />
            </View>
            <Text style={styles.actionText}>Спросить</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/hadiths')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="library" size={28} color={Colors.gold} />
            </View>
            <Text style={styles.actionText}>Хадисы</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Verse */}
        <View style={styles.verseCard}>
          <Text style={styles.verseTitle}>Аят дня 📖</Text>
          <Text style={styles.verseArabic}>{DAILY_VERSE.arabic}</Text>
          <Text style={styles.verseTranslation}>{DAILY_VERSE.translation}</Text>
          <Text style={styles.verseReference}>{DAILY_VERSE.reference}</Text>
        </View>

        {/* Continue Learning */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Продолжить обучение</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)')}>
              <Text style={styles.sectionLink}>Все курсы</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.courseCard}>
            <View style={styles.courseContent}>
              <Text style={styles.courseEmoji}>📘</Text>
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle}>Шафиитский мазхаб</Text>
                <Text style={styles.courseProgress}>3 из 12 уроков · 25%</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={20} color={Colors.gold} />
          </TouchableOpacity>
        </View>

        {/* Leaderboard Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Рейтинг</Text>
            <TouchableOpacity onPress={() => router.push('/rating')}>
              <Text style={styles.sectionLink}>Полный рейтинг</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.leaderboardCard}>
            <View style={styles.leaderboardItem}>
              <Text style={styles.leaderboardRank}>🥇</Text>
              <Text style={styles.leaderboardName}>Абдуллах</Text>
              <Text style={styles.leaderboardPoints}>1,250</Text>
            </View>
            <View style={styles.leaderboardItem}>
              <Text style={styles.leaderboardRank}>🥈</Text>
              <Text style={styles.leaderboardName}>Мухаммад</Text>
              <Text style={styles.leaderboardPoints}>980</Text>
            </View>
            <View style={styles.leaderboardItem}>
              <Text style={styles.leaderboardRank}>🥉</Text>
              <Text style={styles.leaderboardName}>Ахмад</Text>
              <Text style={styles.leaderboardPoints}>850</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, paddingHorizontal: 16 },
  header: {
    paddingTop: 16,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { fontSize: 14, color: Colors.textSecondary },
  name: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary, marginTop: 2 },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    gap: 6,
  },
  pointsText: { fontSize: 18, fontWeight: 'bold', color: Colors.gold },
  nextPrayerCard: {
    backgroundColor: Colors.gold,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    ...Shadows.card,
  },
  nextPrayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  nextPrayerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
  nextPrayerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.background,
    marginBottom: 4,
  },
  nextPrayerTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.background,
    marginBottom: 12,
  },
  timeLeftBadge: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timeLeftText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gold,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  verseCard: {
    backgroundColor: Colors.mediumGreen,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  verseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gold,
    marginBottom: 12,
  },
  verseArabic: {
    fontSize: 24,
    color: Colors.gold,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  verseTranslation: {
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  verseReference: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gold,
  },
  sectionLink: {
    fontSize: 14,
    color: Colors.gold,
    textDecorationLine: 'underline',
  },
  courseCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  courseEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  courseProgress: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  leaderboardCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    gap: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leaderboardRank: {
    fontSize: 24,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  leaderboardPoints: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.gold,
  },
});

