import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Colors } from '../constants/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width={60} height={60} borderRadius={12} />
      <View style={styles.cardContent}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="50%" height={14} style={{ marginTop: 8 }} />
        <Skeleton width="30%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function SkeletonLesson() {
  return (
    <View style={styles.lessonCard}>
      <Skeleton width="100%" height={160} borderRadius={16} />
      <View style={{ padding: 16 }}>
        <Skeleton width="80%" height={20} />
        <Skeleton width="60%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.border,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  lessonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
});
