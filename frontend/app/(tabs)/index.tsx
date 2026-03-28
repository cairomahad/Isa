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
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => router.push('/search')}
            >
              <Ionicons name="search" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={18} color={Colors.gold} />
              <Text style={styles.pointsText}>{userPoints}</Text>
            </View>
          </View>
        </View>

        {/* Next Prayer Card */}
        <View style={styles.nextPrayerCard}>
          <View style={styles.nextPrayerHeader}>
            <Ionicons name="alarm" size={20} color="#FFFFFF" />
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
            onPress={() => router.push('/(tabs)/zikr')}
            testID="quick-action-zikr"
          >
            <View style={styles.actionIcon}>
              <Ionicons name="radio-button-on" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Зикр</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/missed-prayers')}
            testID="quick-action-missed-prayers"
          >
            <View style={styles.actionIcon}>
              <Ionicons name="calendar" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Возмещение</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/qa')}
            testID="quick-action-qa"
          >
            <View style={styles.actionIcon}>
              <Ionicons name="chatbubbles" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.actionText}>Спросить</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/hadiths')}
            testID="quick-action-hadiths"
          >
            <View style={styles.actionIcon}>
              <Ionicons name="library" size={28} color={Colors.primary} />
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
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  
  // Header
  header: {
    paddingTop: 24,
    paddingHorizontal: 20,
    marginBottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { 
    fontSize: 16, 
    color: Colors.textSecondary, 
    fontWeight: '500',
  },
  name: { 
    fontSize: 30, 
    fontWeight: '700', 
    color: Colors.textPrimary, 
    marginTop: 4,
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  pointsText: { 
    fontSize: 17, 
    fontWeight: '700', 
    color: Colors.primary,
  },
  
  // Next Prayer Hero Card - Золотой градиент
  nextPrayerCard: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 28,
    alignItems: 'center',
    ...Shadows.hero,
  },
  nextPrayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  nextPrayerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.95,
  },
  nextPrayerName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  nextPrayerTime: {
    fontSize: 48,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: -2,
    marginBottom: 16,
  },
  timeLeftBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  timeLeftText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Quick Actions - iOS Grid
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 28,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    ...Shadows.card,
  },
  actionIcon: {
    marginBottom: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  
  // Verse Card - Акцент с зелёным
  verseCard: {
    backgroundColor: Colors.greenBackground,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 28,
    borderLeftWidth: 3,
    borderLeftColor: Colors.green,
    ...Shadows.card,
  },
  verseTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verseArabic: {
    fontSize: 24,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '700',
    lineHeight: 38,
  },
  verseTranslation: {
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
    fontWeight: '400',
  },
  verseReference: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Section Headers
  section: {
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  
  // Course Card - Clean White
  courseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  courseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  courseEmoji: {
    fontSize: 34,
    marginRight: 14,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  courseProgress: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  
  // Leaderboard Card
  leaderboardCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    ...Shadows.card,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  leaderboardRank: {
    fontSize: 24,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  leaderboardPoints: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
});

