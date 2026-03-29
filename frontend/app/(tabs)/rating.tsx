import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

type UserRank = { id: string; display_name: string; points: number; rank: number };

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RatingScreen() {
  const { user: currentUser } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [users, setUsers] = useState<UserRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);

  const fetchRating = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/leaderboard?limit=50`);
      const data = await response.json();
      if (data.leaderboard && data.leaderboard.length > 0) {
        const ranked = data.leaderboard.slice(0, 10).map((entry: any) => ({
          id: String(entry.user_id),
          display_name: entry.name || 'Студент',
          points: entry.points || 0,
          rank: entry.rank,
        }));
        setUsers(ranked);
        if (currentUser) {
          const found = data.leaderboard.find((u: any) => String(u.user_id) === currentUser.id);
          setMyRank(found?.rank || null);
        }
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchRating(); }, [fetchRating]);
  useFocusEffect(useCallback(() => { fetchRating(); }, [fetchRating]));

  const onRefresh = () => { setRefreshing(true); fetchRating(); };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>;
  }

  const renderItem = ({ item }: { item: UserRank }) => {
    const medal = MEDALS[item.rank - 1] || '';
    const isMedal = item.rank <= 3;
    return (
      <View style={[styles.userCard, isMedal && styles.medalCard]} testID={`rank-${item.rank}`}>
        <View style={styles.rankCol}>
          {isMedal
            ? <Text style={styles.medal}>{medal}</Text>
            : <Text style={styles.rankNum}>{item.rank}</Text>
          }
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.display_name || '??').slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName} numberOfLines={1}>{item.display_name}</Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>{item.points} ⭐</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Рейтинг</Text>
            <Text style={styles.headerSubtitle}>Топ-10 студентов по баллам</Text>
            {myRank && (
              <View style={styles.myRankCard}>
                <Text style={styles.myRankText}>Ваше место: </Text>
                <Text style={styles.myRankNum}>#{myRank}</Text>
              </View>
            )}
            {users.length >= 3 && (
              <View style={styles.podium}>
                <View style={styles.podiumItem}>
                  <Text style={styles.podiumMedal}>🥈</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>{users[1]?.display_name}</Text>
                  <Text style={styles.podiumPoints}>{users[1]?.points}</Text>
                  <View style={[styles.podiumBar, { height: 60, backgroundColor: '#C0C0C0' }]} />
                </View>
                <View style={styles.podiumItem}>
                  <Text style={styles.podiumMedal}>🥇</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>{users[0]?.display_name}</Text>
                  <Text style={styles.podiumPoints}>{users[0]?.points}</Text>
                  <View style={[styles.podiumBar, { height: 80, backgroundColor: Colors.gold }]} />
                </View>
                <View style={styles.podiumItem}>
                  <Text style={styles.podiumMedal}>🥉</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>{users[2]?.display_name}</Text>
                  <Text style={styles.podiumPoints}>{users[2]?.points}</Text>
                  <View style={[styles.podiumBar, { height: 44, backgroundColor: '#CD7F32' }]} />
                </View>
              </View>
            )}
            <Text style={styles.listTitle}>Все участники</Text>
          </View>
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Рейтинг пуст. Будьте первым!</Text></View>}
      />
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  header: { paddingTop: 16, marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2, marginBottom: 16 },
  myRankCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardDark, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.goldBorder },
  myRankText: { fontSize: 15, color: Colors.textSecondary },
  myRankNum: { fontSize: 18, fontWeight: 'bold', color: Colors.gold },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 24, gap: 8 },
  podiumItem: { flex: 1, alignItems: 'center' },
  podiumMedal: { fontSize: 28, marginBottom: 4 },
  podiumName: { fontSize: 12, color: Colors.textPrimary, textAlign: 'center', marginBottom: 2 },
  podiumPoints: { fontSize: 11, color: Colors.gold, marginBottom: 4 },
  podiumBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  listTitle: { fontSize: 16, fontWeight: '600', color: Colors.gold, marginBottom: 8 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardDark, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.darkGreen, gap: 12 },
  medalCard: { borderColor: Colors.goldBorder, ...Shadows.card },
  rankCol: { width: 32, alignItems: 'center' },
  medal: { fontSize: 22 },
  rankNum: { fontSize: 16, fontWeight: 'bold', color: Colors.textSecondary },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.mediumGreen, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  userName: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  pointsBadge: { backgroundColor: Colors.cardLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.darkGreen },
  pointsText: { fontSize: 13, color: Colors.gold, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: Colors.textSecondary, fontSize: 16 },
});
