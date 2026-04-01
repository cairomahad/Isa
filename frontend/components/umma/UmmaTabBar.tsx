/**
 * UmmaTabBar — плоский дизайн, все кнопки на одном уровне
 */
import React, { useRef, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../contexts/ThemeContext';

const SCREEN_ICONS: Record<string, string> = {
  index:    'home',
  lessons:  'book',
  umma:     'people',
  zikr:     'radio-button-on',
  settings: 'menu',
};

const SCREEN_LABELS: Record<string, string> = {
  index:    'Главная',
  lessons:  'Уроки',
  umma:     'Умма',
  zikr:     'Зикр',
  settings: 'Ещё',
};

function TabItem({
  isFocused, icon, label, onPress, tintColor, isCenter, Colors,
}: {
  isFocused: boolean; icon: string; label: string;
  onPress: () => void; tintColor: string; isCenter?: boolean; Colors: any;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.08 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [isFocused]);

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      testID={`tab-${icon}`}
    >
      <Animated.View style={[styles.tabItemInner, { transform: [{ scale: scaleAnim }] }]}>
        {isCenter ? (
          <LinearGradient
            colors={[Colors.primary, Colors.green || '#2E7D5B']}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={styles.centerCircle}
          >
            <Ionicons name={icon as any} size={26} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={[styles.iconWrap, isFocused && { backgroundColor: tintColor + '18' }]}>
            <Ionicons name={icon as any} size={24} color={tintColor} />
          </View>
        )}
        <Text
          style={[
            styles.tabLabel,
            {
              color: isCenter ? Colors.primary : tintColor,
              fontWeight: isFocused ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const VISIBLE = new Set(['index', 'lessons', 'umma', 'zikr', 'settings']);

export default function UmmaTabBar({ state, descriptors, navigation }: any) {
  const Colors = useColors();
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((route: any) => VISIBLE.has(route.name));

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: Colors.tabBar,
          paddingBottom: Math.max(insets.bottom, 8),
          shadowColor: Colors.textPrimary,
        },
      ]}
      testID="tab-bar"
    >
      {visibleRoutes.map((route: any) => {
        const isFocused = state.routes[state.index].name === route.name;
        const isCenter  = route.name === 'umma';

        const onPress = () => {
          if (!isFocused) navigation.navigate(route.name);
        };

        return (
          <TabItem
            key={route.key}
            isFocused={isFocused}
            icon={SCREEN_ICONS[route.name] || 'ellipse'}
            label={SCREEN_LABELS[route.name] || route.name}
            onPress={onPress}
            tintColor={isFocused ? Colors.tabBarActive : Colors.tabBarInactive}
            isCenter={isCenter}
            Colors={Colors}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  tabItemInner: {
    alignItems: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 44,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
