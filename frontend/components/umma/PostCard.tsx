import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Animated,
} from 'react-native';
import { useRef, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { UmmaPost } from '../../store/ummaStore';

const API = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)}м`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const TYPE_CONFIG = {
  text: { label: 'Пост', color: '#2E7D5B', bg: '#F0F8F4' },
  quote: { label: 'Цитата', color: '#C4963A', bg: '#FFF8EE' },
  question: { label: 'Вопрос', color: '#6B7280', bg: '#F3F4F6' },
};

interface Props {
  post: UmmaPost;
  onLike: (postId: string) => void;
  onReport: (postId: string) => void;
  onDelete?: (postId: string) => void;
  currentUserId: string;
  isOwner: boolean;
  index?: number;
}

export default function PostCard({ post, onLike, onReport, onDelete, currentUserId, isOwner, index = 0 }: Props) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  // Like bounce animation
  const likeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: Math.min(index * 60, 300), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: Math.min(index * 60, 300), useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLike = () => {
    // Bounce animation
    Animated.sequence([
      Animated.timing(likeScale, { toValue: 0.7, duration: 80, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
      Animated.spring(likeScale, { toValue: 1.0, useNativeDriver: true, friction: 5 }),
    ]).start();
    onLike(post.id);
  };

  const handleReport = () => {
    Alert.alert('Пожаловаться', 'Выберите причину жалобы', [
      {
        text: 'Неподобающий контент',
        onPress: async () => {
          try {
            await fetch(`${API}/api/umma/post/${post.id}/report`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: currentUserId, reason: 'inappropriate' }),
            });
            Alert.alert('Жалоба отправлена', 'Мы рассмотрим её в ближайшее время');
          } catch {}
        },
      },
      { text: 'Спам', onPress: async () => {
        try {
          await fetch(`${API}/api/umma/post/${post.id}/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUserId, reason: 'spam' }),
          });
          Alert.alert('Жалоба отправлена');
        } catch {}
      }},
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Удалить пост?', 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => onDelete?.(post.id) },
    ]);
  };

  const typeConf = TYPE_CONFIG[post.type] || TYPE_CONFIG.text;
  const initials = post.author_name.slice(0, 2).toUpperCase();

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: typeConf.color }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{post.author_name}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeConf.bg }]}>
              <Text style={[styles.typeText, { color: typeConf.color }]}>{typeConf.label}</Text>
            </View>
            <Text style={styles.time}>{formatTime(post.created_at)}</Text>
          </View>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} data-testid="delete-post-btn" testID="delete-post-btn">
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Body */}
      <Text style={styles.body}>{post.body}</Text>

      {/* Quote block */}
      {post.type === 'quote' && post.arabic_text && (
        <View style={styles.quoteBlock}>
          <Text style={styles.arabicText}>{post.arabic_text}</Text>
          {post.source && <Text style={styles.sourceText}>{post.source}</Text>}
        </View>
      )}

      {/* Question badge */}
      {post.type === 'question' && (
        <View style={styles.questionBadge}>
          <Ionicons name="help-circle" size={16} color={Colors.textSecondary} />
          <Text style={styles.questionText}>Ожидает ответа от уммы</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: likeScale }] }}>
          <TouchableOpacity
            style={[styles.likeBtn, post.is_liked && styles.likeBtnActive]}
            onPress={handleLike}
            data-testid="like-post-btn"
            testID={`like-btn-${post.id}`}
          >
            <Ionicons
              name={post.is_liked ? 'heart' : 'heart-outline'}
              size={18}
              color={post.is_liked ? '#E53E3E' : Colors.textSecondary}
            />
            <Text style={[styles.likeCount, post.is_liked && { color: '#E53E3E' }]}>
              {post.likes_count}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={handleReport}
          style={styles.reportBtn}
          data-testid="report-post-btn"
          testID={`report-btn-${post.id}`}
        >
          <Ionicons name="flag-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.reportText}>Жалоба</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeText: { fontSize: 11, fontWeight: '600' },
  time: { fontSize: 12, color: Colors.textTertiary },
  deleteBtn: { padding: 6 },
  body: { fontSize: 15, color: Colors.textPrimary, lineHeight: 24, marginBottom: 12 },
  quoteBlock: {
    backgroundColor: Colors.goldBackground || Colors.backgroundPage,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: 12,
  },
  arabicText: {
    fontSize: 24, color: Colors.textPrimary, textAlign: 'right',
    lineHeight: 44, marginBottom: 8, fontWeight: '400',
  },
  sourceText: { fontSize: 13, color: Colors.primary, fontWeight: '600', textAlign: 'right' },
  questionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.backgroundPage, borderRadius: 8, padding: 8, marginBottom: 12,
  },
  questionText: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: Colors.backgroundPage },
  likeBtnActive: { backgroundColor: '#FEE2E2' },
  likeCount: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10 },
  reportText: { fontSize: 13, color: Colors.textTertiary },
});
