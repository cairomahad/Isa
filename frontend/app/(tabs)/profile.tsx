import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Typography } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001';

interface UserProfile {
  user: {
    id: string;
    name: string;
    phone: string;
    role: string;
    points: number;
  };
  stats: {
    completed_lessons: number;
    achievements_count: number;
    quiz_passed: number;
    quiz_total: number;
  };
  achievements: any[];
}

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/api/profile/${user?.id}`);
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Не удалось загрузить профиль</Text>
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
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.user.name.charAt(0).toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{profile.user.name}</Text>
          <Text style={styles.userPhone}>{profile.user.phone}</Text>
          
          {/* Points Badge */}
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={20} color={Colors.primary} />
            <Text style={styles.pointsText}>{profile.user.points} баллов</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="book" size={28} color={Colors.primary} />
            <Text style={styles.statValue}>{profile.stats.completed_lessons}</Text>
            <Text style={styles.statLabel}>Уроков</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trophy" size={28} color={Colors.green} />
            <Text style={styles.statValue}>{profile.stats.achievements_count}</Text>
            <Text style={styles.statLabel}>Достижений</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={28} color={Colors.greenLight} />
            <Text style={styles.statValue}>{profile.stats.quiz_passed}</Text>
            <Text style={styles.statLabel}>Тестов сдано</Text>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Достижения</Text>
            <TouchableOpacity onPress={() => router.push('/achievements' as any)}>
              <Text style={styles.seeAllText}>Все</Text>
            </TouchableOpacity>
          </View>

          {profile.achievements.length > 0 ? (
            profile.achievements.map((achievement, index) => (
              <View key={index} style={styles.achievementCard}>
                <Text style={styles.achievementIcon}>{achievement.icon || '🏅'}</Text>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementDate}>
                    {new Date(achievement.unlocked_at).toLocaleDateString('ru-RU')}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Пока нет достижений</Text>
              <Text style={styles.emptySubtext}>Продолжайте учиться!</Text>
            </View>
          )}
        </View>

        {/* Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Активность</Text>
          
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Всего тестов:</Text>
              <Text style={styles.activityValue}>{profile.stats.quiz_total}</Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Успешно сдано:</Text>
              <Text style={[styles.activityValue, { color: Colors.green }]}>
                {profile.stats.quiz_passed}
              </Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Процент успеха:</Text>
              <Text style={styles.activityValue}>
                {profile.stats.quiz_total > 0
                  ? Math.round((profile.stats.quiz_passed / profile.stats.quiz_total) * 100)
                  : 0}
                %
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />

        {/* Admin Panel Button */}
        {(user?.role === 'admin' || user?.is_admin) && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => router.push('/admin' as any)}
          >
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
            <Text style={styles.adminBtnText}>Панель администратора</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1 },
  adminBtn: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...Shadows.card,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.cardMedium,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '700',
    color: Colors.primary,
  },
  userName: {
    ...Typography.h1,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  pointsText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    ...Shadows.card,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },

  // Section
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...Typography.h2,
  },
  seeAllText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Achievements
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  achievementIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 4,
  },

  // Activity
  activityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    ...Shadows.card,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  activityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
