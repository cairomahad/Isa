/**
 * umma.tsx — адаптация Homescreen.js + Header.js + Feed.js из донора
 * Изменено: expo-router вместо Navigation, Supabase вместо mock,
 *            нет Stories/Reels, нет Comments
 * Структура: Header (как Header.js) + FlatList feed (как Feed.js)
 */
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useUmmaStore } from '../../store/ummaStore';
import { useColors } from '../../contexts/ThemeContext';
import PostCard from '../../components/umma/PostCard';
import PressEffect from '../../components/umma/PressEffect';
import NewPostModal from '../../components/umma/NewPostModal';

const API = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

export default function UmmaScreen() {
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const tabBarHeight = 58 + Math.max(insets.bottom, 8) + 30;

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
    Alert.alert('Удалить пост?', 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive',
        onPress: async () => {
          try { await deletePost(postId, userId); }
          catch (e: any) { Alert.alert('Ошибка', e.message); }
        },
      },
    ]);
  }, [userId]);

  const handleReport = useCallback(async (postId: string) => {
    Alert.alert('Пожаловаться', 'Причина жалобы', [
      { text: 'Неподобающий контент', onPress: async () => {
        try {
          await fetch(`${API}/api/umma/post/${postId}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, reason: 'inappropriate' }),
          });
          Alert.alert('Жалоба отправлена');
        } catch {}
      }},
      { text: 'Спам', onPress: async () => {
        try {
          await fetch(`${API}/api/umma/post/${postId}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, reason: 'spam' }),
          });
          Alert.alert('Жалоба отправлена');
        } catch {}
      }},
      { text: 'Отмена', style: 'cancel' },
    ]);
  }, [userId]);

  // ─── Header — точная структура из donor Header.js ─────────────────────────
  function UmmaHeader() {
    const initials = (user?.display_name || 'АА').slice(0, 2).toUpperCase();
    return (
      <View style={styles.header}>
        {/* Аватар слева — как в Header.js */}
        <PressEffect style={{ position: 'absolute', left: 0 }}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initials}</Text>
          </View>
        </PressEffect>

        {/* Центральный заголовок — как в Header.js */}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Умма</Text>
          <Text style={styles.headerSubtitle}>Исламская лента</Text>
        </View>

        {/* Иконки справа — как в Header.js */}
        <View style={[styles.iconsContainer, { position: 'absolute', right: 0 }]}>
          {canPost && (
            <PressEffect>
              <Pressable
                style={styles.headerIcon}
                onPress={() => setModalVisible(true)}
                testID="compose-btn"
              >
                <Ionicons name="create-outline" size={25} color={Colors.textPrimary} />
              </Pressable>
            </PressEffect>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <UmmaHeader />

      {/* Lock banner */}
      {!canPost && (
        <View style={styles.lockBanner}>
          <Ionicons name="lock-closed" size={14} color={Colors.primary} />
          <Text style={styles.lockText}>
            Завершите Шафиитский или Ханафитский мазхаб, чтобы публиковать
          </Text>
        </View>
      )}

      {/* Feed — аналог Feed.js FlatList */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        // gap: 20 реализован через marginBottom: 20 в PostCard (как в Feed.js contentContainerStyle gap: 20)
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        onEndReached={() => !refreshing && fetchNextPage(userId)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🕌</Text>
              <Text style={styles.emptyTitle}>Умма молчит</Text>
              <Text style={styles.emptySub}>
                {canPost
                  ? 'Будьте первым, кто поделится мудростью!'
                  : 'Завершите курс для публикации'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoading && !refreshing ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <PostCard
            post={item}
            onLike={toggleLike.bind(null, item.id, userId) as any}
            onReport={handleReport}
            onDelete={handleDelete}
            currentUserId={userId}
            isOwner={item.user_id === userId || user?.role === 'admin'}
          />
        )}
      />

      {/* FAB — как кнопка compose, только если canPost */}
      {canPost && (
        <PressEffect style={[styles.fabWrapper, { bottom: tabBarHeight + 12 }]}>
          <Pressable
            style={styles.fab}
            onPress={() => setModalVisible(true)}
            testID="fab-new-post-btn"
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </PressEffect>
      )}

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

  // Header — структура из Header.js
  header: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 5,
    marginHorizontal: 20,
    paddingVertical: 12,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { color: Colors.textSecondary, fontSize: 13 },
  iconsContainer: { flexDirection: 'row' },
  headerIcon: { marginLeft: 10 },

  // Lock banner
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.greenBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lockText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  // Feed — contentContainerStyle из Feed.js
  feedContent: {
    paddingTop: 10,
    paddingBottom: 120,   // tabBarPadding как в donor
  },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptySub: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  // FAB
  fabWrapper: { position: 'absolute', bottom: 110, right: 20 },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
});
