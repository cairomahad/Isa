import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/colors';

type Student = {
  user_id: string;
  display_name: string;
  phone: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  points: number;
  pending_homeworks: number;
  pending_questions: number;
};

export default function AdminStudentsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  
  useEffect(() => {
    fetchStudents();
  }, []);
  
  const fetchStudents = async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001';
      const response = await fetch(`${backendUrl}/api/admin/students`);
      const data = await response.json();
      
      setStudents(data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Студенты ({students.length})</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.scroll}>
        {students.map((student) => (
          <View key={student.user_id} style={styles.studentCard}>
            <View style={styles.studentHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {student.display_name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.display_name}</Text>
                <Text style={styles.studentPhone}>{student.phone}</Text>
              </View>
              
              <View style={styles.pointsBadge}>
                <Ionicons name="star" size={16} color={Colors.gold} />
                <Text style={styles.pointsText}>{student.points}</Text>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Прогресс уроков</Text>
                <Text style={styles.progressValue}>
                  {student.completed_lessons}/{student.total_lessons}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${student.progress_percentage}%` },
                  ]}
                />
              </View>
            </View>
            
            {/* Stats */}
            <View style={styles.statsRow}>
              {student.pending_homeworks > 0 && (
                <View style={[styles.statBadge, styles.statBadgeWarning]}>
                  <Ionicons name="clipboard" size={14} color={Colors.error} />
                  <Text style={styles.statBadgeText}>
                    ДЗ: {student.pending_homeworks}
                  </Text>
                </View>
              )}
              
              {student.pending_questions > 0 && (
                <View style={[styles.statBadge, styles.statBadgeInfo]}>
                  <Ionicons name="help-circle" size={14} color={Colors.primary} />
                  <Text style={styles.statBadgeText}>
                    Вопросы: {student.pending_questions}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scroll: { flex: 1, paddingHorizontal: 20 },
  
  studentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    ...Shadows.card,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.greenBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.green,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  studentPhone: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.goldBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gold,
  },
  
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.backgroundPage,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statBadgeWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statBadgeInfo: {
    backgroundColor: 'rgba(196, 150, 58, 0.1)',
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
