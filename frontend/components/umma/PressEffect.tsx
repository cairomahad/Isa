/**
 * PressEffect — порт из donor: components/UI/PressEffect.js
 * Использует react-native Animated вместо Reanimated
 */
import React, { useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const PressEffect: React.FC<Props> = ({ children, style }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleTouchStart = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.8,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const handleTouchEnd = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  return (
    <Animated.View
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={[style, { transform: [{ scale: scaleAnim }] }]}
    >
      {children}
    </Animated.View>
  );
};

export default PressEffect;
