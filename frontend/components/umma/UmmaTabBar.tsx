/**
 * UmmaTabBar — адаптация TabBar.js + TabBarSvg.js из донора
 * Изменено: expo-router/bottom-tabs props вместо React Navigation,
 *            Colors вместо GlobalStyles, LinearGradient для центральной кнопки,
 *            Animated (react-native) вместо Reanimated withTiming/withSpring
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Pressable, StyleSheet, Dimensions, Animated, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Path, Svg } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../../contexts/ThemeContext';
import { useRouter } from 'expo-router';

const { width: WIDTH } = Dimensions.get('screen');

// ─── TabBarSvg — точная копия из donor: components/tabBar/TabBarSvg.js ─────────
interface TabBarSvgProps { height: number; fill: string }

function TabBarSvg({ height, fill }: TabBarSvgProps) {
  const HEIGHT = height;
  const SPACE = 10;
  const MIDPOIN1X = WIDTH / 2 - 50 / 2 - SPACE;
  const MIDPOIN2X = WIDTH / 2 + 50 / 2 + SPACE;
  const MIDPOINY  = 50 / 2 + SPACE;
  const radius = 10;

  const path = `
    M0,0
    L${MIDPOIN1X - radius},${0}
    A${radius},${radius} 0 0,1 ${MIDPOIN1X},${radius}
    A${MIDPOINY},${MIDPOINY} 0 0,0 ${WIDTH / 2},${MIDPOINY}
    A${MIDPOINY},${MIDPOINY} 0 0,0 ${MIDPOIN2X},${radius}
    A${radius},${radius} 0 0,1 ${MIDPOIN2X + radius},${0}
    L${MIDPOIN2X},${0}
    L${WIDTH},${0}
    L${WIDTH},${height}
    L${0},${height}
    L${0},${0}
    Z
  `;

  return (
    <Svg
      style={{ position: 'absolute', bottom: 0 }}
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
    >
      <Path d={path} fill={fill} />
    </Svg>
  );
}

// ─── TabItem — анимированная иконка из donor: TabBar.js ──────────────────────
interface TabItemProps {
  isFocused: boolean;
  icon: string;
  onPress: () => void;
  tintColor: string;
}

function TabItem({ isFocused, icon, onPress, tintColor }: TabItemProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(isFocused ? 1 : 0.5)).current;

  useEffect(() => {
    // Аналог useAnimatedStyle из TabBar.js — translateX/Y при фокусе
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: isFocused ? -10 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: isFocused ? -6 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: isFocused ? 1 : 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
    >
      <Animated.View
        style={{
          transform: [{ translateX }, { translateY }],
          opacity,
          padding: 15,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name={icon as any}
          size={25}
          color={tintColor}
        />
      </Animated.View>
    </Pressable>
  );
}

// ─── CenterButton — адаптация NewPostIcon из donor ───────────────────────────
interface CenterButtonProps {
  isFocused: boolean;
  onPress: () => void;
  Colors: any;
}

function CenterButton({ isFocused, onPress, Colors }: CenterButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isFocused ? 1.1 : 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  }, [isFocused]);

  return (
    <View style={styles.centerSlot}>
      <Animated.View style={{ transform: [{ translateY: -(50 / 2 + 5) }, { scale }] }}>
        <TouchableOpacity onPress={onPress} style={styles.centerPressable} activeOpacity={0.8}>
          <LinearGradient
            colors={[Colors.primary, Colors.green]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={styles.centerGradient}
          >
            <Ionicons name="people" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Маппинг экрана → иконка Ionicons ────────────────────────────────────────
const SCREEN_ICONS: Record<string, string> = {
  index:    'home',
  lessons:  'book',
  umma:     'people',
  zikr:     'radio-button-on',
  settings: 'menu',
};

// ─── UmmaTabBar — главный компонент ──────────────────────────────────────────
export default function UmmaTabBar({ state, descriptors, navigation }: any) {
  const Colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const tabHeight = 58 + Math.max(insets.bottom, 8);

  // Только видимые вкладки
  const visibleRoutes = state.routes.filter(
    (route: any) => descriptors[route.key].options.href !== null
  );

  return (
    <View style={{ height: tabHeight + 40, position: 'relative' }}>
      {/* SVG кривая — точная копия из TabBarSvg.js */}
      <TabBarSvg height={tabHeight} fill={Colors.tabBar} />

      <View
        style={[
          styles.container,
          { height: tabHeight, paddingBottom: Math.max(insets.bottom, 8) },
        ]}
      >
        {visibleRoutes.map((route: any, index: number) => {
          const isFocused = state.routes[state.index].name === route.name;
          const isCenter  = route.name === 'umma';

          // FIX: simple navigate without navigation.emit to prevent crash
          const onPress = () => {
            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <CenterButton
                key={route.key}
                isFocused={isFocused}
                onPress={onPress}
                Colors={Colors}
              />
            );
          }

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              icon={SCREEN_ICONS[route.name] || 'ellipse'}
              onPress={onPress}
              tintColor={isFocused ? Colors.tabBarActive : Colors.tabBarInactive}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: 'visible',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Центральная кнопка — аналог transformY из TabBar.js
  centerSlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  centerPressable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
