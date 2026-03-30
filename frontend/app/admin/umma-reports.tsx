import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';

const API = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

export default function UmmaReportsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/umma/reports?user_id=${user?.id}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const hidePost = async (postId: string) => {
    Alert.alert('Скрыть пост?', 'Пост будет скрыт из ленты', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Скрыть', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API}/api/umma/post/${postId}?user_id=${user?.id}`, { method: 'DELETE' });
            setReports(r => r.filter(rep => rep.post_id !== postId));
            Alert.alert('Готово', 'Пост скрыт');
          } catch (e: any) {
            Alert.alert('Ошибка', e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={Colors.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Жалобы Умма ({reports.length})</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReports(); }} tintColor={Colors.primary} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.green} />
            <Text style={styles.emptyText}>Жалоб нет</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Ionicons name="flag" size={16} color={Colors.error} />
              <Text style={styles.reason}>{item.reason || 'Без причины'}</Text>
              <Text style={styles.reportDate}>
                {new Date(item.created_at).toLocaleDateString('ru-RU')}
              </Text>
            </View>
            {item.umma_posts && (
              <View style={styles.postPreview}>
                <Text style={styles.postBody} numberOfLines={3}>
                  {item.umma_posts.body}
                </Text>
                {item.umma_posts.is_hidden && (
                  <View style={styles.hiddenBadge}>
                    <Ionicons name="eye-off" size={12} color={Colors.error} />
                    <Text style={styles.hiddenText}>Уже скрыт</Text>
                  </View>
                )}
              </View>
            )}
            {!item.umma_posts?.is_hidden && (
              <TouchableOpacity
                style={styles.hideBtn}
                onPress={() => hidePost(item.post_id)}
                testID="hide-post-btn"
              >
                <Ionicons name="eye-off-outline" size={16} color={Colors.error} />
                <Text style={styles.hideBtnText}>Скрыть пост</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  reportCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, ...Shadows.card },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reason: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.error },
  reportDate: { fontSize: 12, color: Colors.textTertiary },
  postPreview: { backgroundColor: Colors.backgroundPage, borderRadius: 10, padding: 12, marginBottom: 12 },
  postBody: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  hiddenBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  hiddenText: { fontSize: 12, color: Colors.error },
  hideBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.error },
  hideBtnText: { fontSize: 14, fontWeight: '600', color: Colors.error },
});
