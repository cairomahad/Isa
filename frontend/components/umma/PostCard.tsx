/**
 * PostCard — адаптация PostAdvance.js + Post.js из донора
 * Изменено: expo-router вместо Navigation, Colors вместо GlobalStyles,
 *            нет изображений (text-only), нет комментариев/share,
 *            добавлены: типы постов, арабский текст, жалоба
 */
import {
  View, Text, StyleSheet, Pressable, Dimensions,
} from 'react-native';
import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../../contexts/ThemeContext';
import PressEffect from './PressEffect';
import { UmmaPost } from '../../store/ummaStore';

const { width } = Dimensions.get('window');

/** timeDifference — точная копия из donor: utils/helperFunctions.js (русская локаль) */
export function timeDifference(timeString: string): string {
  const currentDate = new Date();
  const previousDate = new Date(timeString);
  const diff = currentDate.getTime() - previousDate.getTime();

  const minute = 60 * 1000;
  const hour   = minute * 60;
  const day    = hour * 24;
  const week   = day * 7;
  const month  = day * 30;
  const year   = day * 365;

  if (diff < minute)  return `${Math.round(diff / 1000)} сек. назад`;
  if (diff < hour)    return `${Math.round(diff / minute)} мин. назад`;
  if (diff < day)     return `${Math.round(diff / hour)} ч. назад`;
  if (diff < week)    return `${Math.round(diff / day)} дн. назад`;
  if (diff < month)   return `${Math.round(diff / week)} нед. назад`;
  if (diff < year)    return `${Math.round(diff / month)} мес. назад`;
  return `${Math.round(diff / year)} г. назад`;
}

/** FooterButton — аналог FooterButton из PostAdvance.js */
function FooterButton({
  icon, count, onPress, color,
}: {
  icon: string; count?: number; onPress: () => void; color?: string;
}) {
  const Colors = useColors();
  return (
    <PressEffect>
      <Pressable style={styles.footerIcon} onPress={onPress}>
        <View style={[styles.footerIconBg, { backgroundColor: Colors.cardDark }]}>
          <Ionicons name={icon as any} size={20} color={color || Colors.textSecondary} />
          {count !== undefined && (
            <Text style={[styles.footerCount, { color: color || Colors.textSecondary }]}>
              {count}
            </Text>
          )}
        </View>
      </Pressable>
    </PressEffect>
  );
}

/** Avatar — аналог Avatar из PostAdvance.js */
function Avatar({ name, gradient }: { name: string; gradient: [string, string] }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={styles.avatarGradient}
    >
      <Text style={styles.avatarText}>{initials}</Text>
    </LinearGradient>
  );
}

// Градиенты для аватаров (как разные цвета в донорском приложении)
const GRADIENTS: [string, string][] = [
  ['#7A40F8', '#4cc9f0'],
  ['#C4963A', '#E8C97A'],
  ['#2E7D5B', '#4CAF7D'],
  ['#f72585', '#C459F4'],
  ['#C44536', '#fdac1d'],
];

function getGradient(name: string): [string, string] {
  const idx = name.charCodeAt(0) % GRADIENTS.length;
  return GRADIENTS[idx];
}

const TYPE_ICONS: Record<string, string> = {
  text: 'document-text',
  quote: 'bookmarks',
  question: 'help-circle',
};

interface Props {
  post: UmmaPost;
  onLike: (postId: string) => void;
  onReport: (postId: string) => void;
  onDelete?: (postId: string) => void;
  currentUserId: string;
  isOwner: boolean;
}

export default function PostCard({
  post, onLike, onReport, onDelete, currentUserId, isOwner,
}: Props) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const gradient = getGradient(post.author_name);
  const isLiked = post.is_liked;

  function PostFooter() {
    return (
      <View style={styles.footerContainer}>
        {/* Левая часть — аватар + имя+время (как в PostAdvance Avatar) */}
        <PressEffect>
          <View style={styles.authorRow}>
            <Avatar name={post.author_name} gradient={gradient} />
            <View style={styles.authorMeta}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.author_name}
              </Text>
              <Text style={styles.authorTime}>
                {timeDifference(post.created_at)}
              </Text>
            </View>
          </View>
        </PressEffect>

        {/* Правая часть — кнопки действий */}
        <View style={styles.actionButtons}>
          <FooterButton
            icon={isLiked ? 'heart' : 'heart-outline'}
            count={post.likes_count}
            onPress={() => onLike(post.id)}
            color={isLiked ? '#ef3e55' : Colors.textSecondary}
          />
          {isOwner && (
            <FooterButton
              icon="trash-outline"
              onPress={() => onDelete?.(post.id)}
              color={Colors.error}
            />
          )}
          <FooterButton
            icon="flag-outline"
            onPress={() => onReport(post.id)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Тип-бейдж (аналог PostHeader с SVG в Post.js) */}
      <View style={styles.typeBadgeRow}>
        <View style={styles.typeBadge}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={styles.typeBadgeGradient}
          >
            <Ionicons name={TYPE_ICONS[post.type] as any} size={12} color="#fff" />
            <Text style={styles.typeBadgeText}>
              {post.type === 'text' ? 'Пост' : post.type === 'quote' ? 'Цитата' : 'Вопрос'}
            </Text>
          </LinearGradient>
        </View>
      </View>

      {/* Тело поста */}
      <Text style={styles.body}>{post.body}</Text>

      {/* Арабская цитата */}
      {post.type === 'quote' && post.arabic_text && (
        <View style={styles.quoteBlock}>
          <Text style={styles.arabicText}>{post.arabic_text}</Text>
          {post.source && (
            <Text style={styles.sourceText}>{post.source}</Text>
          )}
        </View>
      )}

      {/* Вопрос-индикатор */}
      {post.type === 'question' && (
        <View style={styles.questionRow}>
          <Ionicons name="help-circle" size={16} color={Colors.textSecondary} />
          <Text style={styles.questionText}>Ожидает ответа уммы</Text>
        </View>
      )}

      {/* Footer — PostStats из PostAdvance.js */}
      <PostFooter />
    </View>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  // Карточка — аналог PostAdvance контейнера
  card: {
    backgroundColor: Colors.cardDark,
    borderRadius: 30,               // точно как в PostAdvance
    marginHorizontal: 10,           // точно как в PostAdvance
    marginBottom: 20,               // gap: 20 как в Feed.js
    padding: 15,                    // как в Post.js
    overflow: 'hidden',
  },
  // Бейдж типа — заменяет SVG PostHeader из Post.js
  typeBadgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typeBadge: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  typeBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  // Тело поста
  body: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: 5,
    paddingBottom: 12,
  },
  // Арабская цитата
  quoteBlock: {
    backgroundColor: Colors.backgroundPage,
    borderRadius: 15,
    padding: 14,
    marginHorizontal: 5,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  arabicText: {
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: 'right',
    lineHeight: 44,
    marginBottom: 6,
  },
  sourceText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 5,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  // Footer — аналог PostStats из PostAdvance.js
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  // Левая часть — Avatar (аналог Avatar из PostAdvance)
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  authorMeta: {
    marginLeft: 8,
  },
  authorName: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
    maxWidth: 120,
  },
  authorTime: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 1,
  },
  // Правая часть — кнопки (аналог FooterButton из PostAdvance)
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerIcon: {
    margin: 3,
  },
  // Круглый контейнер кнопки — точно как в PostAdvance FooterButton
  footerIconBg: {
    padding: 9,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerCount: {
    fontSize: 13,
    fontWeight: '600',
  },
});
