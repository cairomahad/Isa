import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useUmmaStore } from '../../store/ummaStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import PostCard from '../../components/umma/PostCard';
import NewPostModal from '../../components/umma/NewPostModal';

export default function UmmaScreen() {
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const {
    posts, isLoading, hasMore, canPost,
    fetchPosts, fetchNextPage, checkCanPost, toggleLike, deletePost,
  } = useUmmaStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.id ?? '';

  const loadFeed = useCallback(async (reset = true) => {
    if (!userId) return;
    await Promise.all([
      fetchPosts(userId, reset),
      checkCanPost(userId),
    ]);
  }, [userId]);

  useEffect(() => { loadFeed(); }, [loadFeed]);
  useFocusEffect(useCallback(() => { loadFeed(); }, [loadFeed]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed(true);
    setRefreshing(false);
  }, [loadFeed]);

  const handleDelete = useCallback(async (postId: string) => {
    try {
      await deletePost(postId, userId);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  }, [userId]);

  const renderPost = useCallback(({ item, index }: any) => (
    <PostCard
      key={item.id}
      post={item}
      onLike={() => toggleLike(item.id, userId)}
      onReport={(postId) => {}}
      onDelete={handleDelete}
      currentUserId={userId}
      isOwner={item.user_id === userId || user?.role === 'admin'}
      index={index}
    />
  ), [userId, user?.role]);

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>🕌</Text>
        <Text style={styles.emptyTitle}>Умма молчит</Text>
        <Text style={styles.emptySub}>
          {canPost
            ? 'Будьте первым, кто поделится мудростью!'
            : 'Завершите курс, чтобы публиковать'}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || refreshing) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Умма</Text>
          <Text style={styles.subtitle}>Исламская лента</Text>
        </View>
        {canPost && (
          <TouchableOpacity
            style={styles.writeBtn}
            onPress={() => setModalVisible(true)}
            testID="write-post-btn"
          >
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
            <Text style={styles.writeBtnText}>Написать</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lock banner */}
      {!canPost && (
        <View style={styles.lockBanner}>
          <Ionicons name="lock-closed" size={16} color={Colors.primary} />
          <Text style={styles.lockText}>
            Завершите Шафиитский или Ханафитский мазхаб, чтобы публиковать посты
          </Text>
        </View>
      )}

      {/* Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        onEndReached={() => !refreshing && fetchNextPage(userId)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* FAB */}
      {canPost && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
          testID="fab-new-post-btn"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* New Post Modal */}
      <NewPostModal
        visible={modalVisible}
        userId={userId}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
  writeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.goldBackground || Colors.primaryLight,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  writeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  lockBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.greenBackground,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  lockText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  list: { paddingTop: 12, paddingBottom: 100 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
