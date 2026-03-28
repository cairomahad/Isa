import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Typography } from '../constants/colors';
import { router } from 'expo-router';

interface QuizQuestion {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
}

interface QuizScreenProps {
  lessonId: string;
  lessonTitle: string;
  questions: QuizQuestion[];
  onComplete: (score: number, total: number, passed: boolean) => void;
  onClose: () => void;
}

export default function QuizScreen({
  lessonId,
  lessonTitle,
  questions,
  onComplete,
  onClose,
}: QuizScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  useEffect(() => {
    // Анимация прогресса
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === currentQuestion.correct_option;
    if (isCorrect) {
      setCorrectAnswers(correctAnswers + 1);
    }

    // Анимация feedback
    Animated.sequence([
      Animated.timing(feedbackAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Автоматический переход к следующему вопросу
    setTimeout(() => {
      handleNext();
    }, 1500);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // Тест завершён
      const score = correctAnswers;
      const total = questions.length;
      const passed = (score / total) >= 0.6; // 60% для прохождения
      
      setQuizCompleted(true);
      onComplete(score, total, passed);
    }
  };

  const getOptionStyle = (option: string) => {
    if (!isAnswered) {
      return styles.option;
    }

    if (option === currentQuestion.correct_option) {
      return [styles.option, styles.optionCorrect];
    }

    if (option === selectedOption && option !== currentQuestion.correct_option) {
      return [styles.option, styles.optionWrong];
    }

    return [styles.option, styles.optionDisabled];
  };

  const getOptionIcon = (option: string) => {
    if (!isAnswered) return null;

    if (option === currentQuestion.correct_option) {
      return <Ionicons name="checkmark-circle" size={24} color={Colors.green} />;
    }

    if (option === selectedOption && option !== currentQuestion.correct_option) {
      return <Ionicons name="close-circle" size={24} color={Colors.error} />;
    }

    return null;
  };

  if (quizCompleted) {
    const score = correctAnswers;
    const total = questions.length;
    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= 60;

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.resultsContainer}>
          <View style={styles.resultsIcon}>
            <Ionicons
              name={passed ? 'trophy' : 'ribbon'}
              size={80}
              color={passed ? Colors.primary : Colors.textSecondary}
            />
          </View>

          <Text style={styles.resultsTitle}>
            {passed ? 'Отлично!' : 'Почти получилось!'}
          </Text>

          <Text style={styles.resultsText}>
            Вы ответили правильно на
          </Text>

          <Text style={styles.resultsScore}>
            {score} из {total}
          </Text>

          <Text style={styles.resultsPercentage}>
            {percentage}%
          </Text>

          {passed ? (
            <Text style={styles.resultsMessage}>
              ✅ Вы успешно прошли тест!
            </Text>
          ) : (
            <Text style={styles.resultsMessage}>
              📚 Повторите материал и попробуйте снова
            </Text>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="close" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.lessonTitle} numberOfLines={1}>
              {lessonTitle}
            </Text>
            <Text style={styles.questionCounter}>
              Вопрос {currentIndex + 1} из {questions.length}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Question */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.questionCard}>
            <Text style={styles.question}>{currentQuestion.question}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {['option_a', 'option_b', 'option_c', 'option_d'].map((key, index) => {
              const optionValue = currentQuestion[key as keyof QuizQuestion] as string;
              const optionLetter = String.fromCharCode(65 + index); // A, B, C, D

              return (
                <TouchableOpacity
                  key={key}
                  style={getOptionStyle(key)}
                  onPress={() => handleSelectOption(key)}
                  disabled={isAnswered}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <View style={styles.optionLetter}>
                      <Text style={styles.optionLetterText}>{optionLetter}</Text>
                    </View>
                    <Text style={styles.optionText}>{optionValue}</Text>
                  </View>
                  {getOptionIcon(key)}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Feedback */}
          {isAnswered && (
            <Animated.View
              style={[
                styles.feedback,
                {
                  opacity: feedbackAnim,
                  transform: [
                    {
                      scale: feedbackAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.feedbackText}>
                {selectedOption === currentQuestion.correct_option
                  ? '✅ Правильно!'
                  : '❌ Неправильно'}
              </Text>
            </Animated.View>
          )}
        </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  headerInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  questionCounter: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  progressContainer: {
    height: 4,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    ...Shadows.cardMedium,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  optionCorrect: {
    borderColor: Colors.green,
    backgroundColor: Colors.greenBackground,
  },
  optionWrong: {
    borderColor: Colors.error,
    backgroundColor: '#FEE',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  optionLetter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  optionText: {
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  feedback: {
    marginTop: 20,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  resultsIcon: {
    marginBottom: 24,
  },
  resultsTitle: {
    ...Typography.h1,
    fontSize: 32,
    marginBottom: 16,
    textAlign: 'center',
  },
  resultsText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  resultsScore: {
    fontSize: 56,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  resultsPercentage: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  resultsMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  closeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    ...Shadows.gold,
  },
  closeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
