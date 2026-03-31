import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';
import { Cache } from '../../services/cache';


const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001';
const { width } = Dimensions.get('window');

type AdminStats = {
  total_users: number;
  active_today: number;
  active_week: number;
  pending_questions: number;
  pending_homeworks: number;
};

export default function AdminPanel() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    active_today: 0,
    active_week: 0,
    pending_questions: 0,
    pending_homeworks: 0,
  });

  useEffect(() => {
    // Check access - временно отключим проверку role
    // if (!user || user.role !== 'admin') {
    //   router.replace('/(tabs)');
    //   return;
    // }
    
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`);
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.warn('Error fetching stats:', error);
      // Demo data
      setStats({
        total_users: 156,
        active_today: 23,
        active_week: 89,
        pending_questions: 5,
        pending_homeworks: 12,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Админ Панель 🔐</Text>
            <Text style={styles.subtitle}>Управление контентом</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              useAuthStore.getState().setSession(null);
              useAuthStore.getState().setUser(null);
              router.replace('/(auth)/welcome');
            }}
          >
            <Ionicons name="log-out-outline" size={24} color={Colors.error} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_users}</Text>
            <Text style={styles.statLabel}>Всего студентов</Text>
            <Ionicons name="people" size={32} color={Colors.primary} style={styles.statIcon} />
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.active_today}</Text>
            <Text style={styles.statLabel}>Активны сегодня</Text>
            <Ionicons name="today" size={32} color={Colors.green} style={styles.statIcon} />
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending_questions}</Text>
            <Text style={styles.statLabel}>Вопросов ожидают</Text>
            <Ionicons name="help-circle" size={32} color={Colors.primary} style={styles.statIcon} />
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending_homeworks}</Text>
            <Text style={styles.statLabel}>ДЗ на проверке</Text>
            <Ionicons name="clipboard" size={32} color={Colors.primary} style={styles.statIcon} />
          </View>
        </View>

        {/* Management Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Управление контентом</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/admin/review?type=homework')}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="clipboard" size={24} color={Colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Домашние задания</Text>
              <Text style={styles.menuSubtitle}>Проверить ДЗ студентов ({stats.pending_homeworks})</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/admin/review?type=questions')}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="help-circle" size={24} color={Colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Вопросы студентов</Text>
              <Text style={styles.menuSubtitle}>Ответить на вопросы ({stats.pending_questions})</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/admin/manage-lessons')}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="videocam" size={24} color={Colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Видео уроки</Text>
              <Text style={styles.menuSubtitle}>Добавить / Редактировать уроки</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/admin/umma-reports')}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="flag" size={24} color={Colors.error} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Жалобы Умма</Text>
              <Text style={styles.menuSubtitle}>Модерация публичной ленты</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/admin/manage-quiz')}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="create" size={24} color={Colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Тесты</Text>
              <Text style={styles.menuSubtitle}>Добавить / Редактировать тесты</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="library" size={24} color={Colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Хадисы / Истории / Пользы</Text>
              <Text style={styles.menuSubtitle}>Управление ежедневным контентом</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Cache Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Кэш</Text>
          <TouchableOpacity
            style={[styles.menuItem, { borderLeftWidth: 3, borderLeftColor: Colors.error }]}
            onPress={async () => {
              await Cache.clearAll();
              Alert.alert('Готово', 'Весь кэш очищен. Данные обновятся при следующем открытии экранов.');
            }}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: Colors.error + '15' }]}>
              <Ionicons name="refresh" size={24} color={Colors.error} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: Colors.error }]}>Сбросить весь кэш</Text>
              <Text style={styles.menuSubtitle}>Хадисы, молитвы, Q&A — принудительно обновятся</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Users Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Студенты</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/admin/students')}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="people" size={24} color={Colors.green} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Список студентов</Text>
              <Text style={styles.menuSubtitle}>Просмотр всех пользователей</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="bar-chart" size={24} color={Colors.green} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Статистика</Text>
              <Text style={styles.menuSubtitle}>Прогресс студентов по курсам</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="notifications" size={24} color={Colors.green} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Рассылка</Text>
              <Text style={styles.menuSubtitle}>Отправить уведомление всем</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1, paddingHorizontal: 20 },
  header: {
    paddingTop: 24,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    ...Shadows.card,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.2,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.greenBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
