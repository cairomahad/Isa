import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Shadows, Typography } from '../constants/colors';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    emoji: '📚',
    title: 'Обучайтесь',
    description: 'Смотрите видео-уроки, изучайте хадисы и истории из жизни пророка ﷺ',
  },
  {
    emoji: '🎯',
    title: 'Выполняйте задания',
    description: 'Сдавайте домашние работы, проходите тесты и зарабатывайте баллы',
  },
  {
    emoji: '🏆',
    title: 'Соревнуйтесь',
    description: 'Поднимайтесь в рейтинге, получайте достижения и развивайтесь',
  },
  {
    emoji: '🤲',
    title: 'Практикуйте',
    description: 'Читайте зикры, следите за намазом и укрепляйте свою связь с Аллахом',
  },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/(auth)/welcome');
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Skip Button */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Пропустить</Text>
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.emoji}>{step.emoji}</Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>
        </View>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentStep === index && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Начать' : 'Далее'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.backgroundPage,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 100,
    marginBottom: 32,
  },
  title: {
    ...Typography.h1,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 17,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...Shadows.gold,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
