import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { session } = useAuthStore();

  useEffect(() => {
    checkInitialRoute();
  }, []);

  const checkInitialRoute = async () => {
    try {
      // Проверяем показали ли onboarding
      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
      
      if (!onboardingCompleted) {
        // Первый запуск - показываем onboarding
        router.replace('/onboarding');
        return;
      }

      // Проверяем авторизацию
      if (!session) {
        router.replace('/(auth)/welcome');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error checking initial route:', error);
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundPage,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
