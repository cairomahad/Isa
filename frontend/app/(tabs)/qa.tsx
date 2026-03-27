import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

type Question = {
  id: string;
  question_text: string;
  answer_text: string | null;
  status: 'pending' | 'answered';
  created_at: string;
  answered_at: string | null;
};

const DEMO_QUESTIONS: Question[] = [
  {
    id: '1',
    question_text: 'Можно ли читать намаз дома, если мечеть далеко?',
    answer_text: 'Да, если расстояние до мечети слишком велико или есть уважительная причина, можно совершать намаз дома. Однако коллективный намаз в мечети имеет большую награду.',
    status: 'answered',
    created_at: '2024-03-20T10:30:00Z',
    answered_at: '2024-03-20T14:00:00Z',
  },
  {
    id: '2',
    question_text: 'Как правильно возмещать пропущенные намазы?',
    answer_text: null,
    status: 'pending',
    created_at: '2024-03-25T09:15:00Z',
    answered_at: null,
  },
];

function QuestionCard({ question }: { question: Question }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <View style={styles.statusBadge}>
          {question.status === 'answered' ? (
            <>
              <Ionicons name="checkmark-circle" size={16} color={Colors.gold} />
              <Text style={styles.statusText}>Отвечено</Text>
            </>
          ) : (
            <>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={[styles.statusText, { color: Colors.textSecondary }]}>Ожидание</Text>
            </>
          )}
        </View>
        <Text style={styles.questionDate}>{formatDate(question.created_at)}</Text>
      </View>

      <Text style={styles.questionText}>{question.question_text}</Text>

      {question.status === 'answered' && (
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandButtonText}>
            {expanded ? 'Скрыть ответ' : 'Посмотреть ответ'}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={Colors.gold}
          />
        </TouchableOpacity>
      )}

      {expanded && question.answer_text && (
        <View style={styles.answerContainer}>
          <View style={styles.answerHeader}>
            <Ionicons name="person-circle" size={24} color={Colors.gold} />
            <Text style={styles.answerHeaderText}>Ответ Шейха</Text>
          </View>
          <Text style={styles.answerText}>{question.answer_text}</Text>
          {question.answered_at && (
            <Text style={styles.answerDate}>
              Отвечено {formatDate(question.answered_at)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function QAScreen() {
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<Question[]>(DEMO_QUESTIONS);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите ваш вопрос');
      return;
    }

    if (newQuestion.trim().length < 10) {
      Alert.alert('Ошибка', 'Вопрос должен быть не менее 10 символов');
      return;
    }

    setLoading(true);

    // TODO: Send to backend API
    const newQ: Question = {
      id: Date.now().toString(),
      question_text: newQuestion.trim(),
      answer_text: null,
      status: 'pending',
      created_at: new Date().toISOString(),
      answered_at: null,
    };

    setTimeout(() => {
      setQuestions([newQ, ...questions]);
      setNewQuestion('');
      setShowForm(false);
      setLoading(false);
      Alert.alert('Успешно!', 'Ваш вопрос отправлен Шейху. Ожидайте ответа.');
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Вопросы Шейху 🤲</Text>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={Colors.gold} />
            <Text style={styles.infoText}>
              Задайте свой вопрос по религии, и Шейх ответит вам в ближайшее время
            </Text>
          </View>

          {/* Ask Question Button */}
          {!showForm && (
            <TouchableOpacity
              style={styles.askButton}
              onPress={() => setShowForm(true)}
            >
              <Ionicons name="add-circle" size={24} color={Colors.background} />
              <Text style={styles.askButtonText}>Задать вопрос</Text>
            </TouchableOpacity>
          )}

          {/* Question Form */}
          {showForm && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Ваш вопрос</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Введите ваш вопрос..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={6}
                value={newQuestion}
                onChangeText={setNewQuestion}
                maxLength={500}
              />
              <Text style={styles.charCount}>{newQuestion.length}/500</Text>

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowForm(false);
                    setNewQuestion('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Отмена</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmitQuestion}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.background} />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color={Colors.background} />
                      <Text style={styles.submitButtonText}>Отправить</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Questions List */}
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>
              Мои вопросы ({questions.length})
            </Text>

            {questions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>У вас пока нет вопросов</Text>
                <Text style={styles.emptySubtext}>Задайте свой первый вопрос!</Text>
              </View>
            ) : (
              questions.map((q) => <QuestionCard key={q.id} question={q} />)
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, paddingHorizontal: 16 },
  header: {
    paddingTop: 16,
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.gold },
  infoCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    marginLeft: 12,
    lineHeight: 20,
  },
  askButton: {
    backgroundColor: Colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
    ...Shadows.card,
  },
  askButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.background,
    marginLeft: 8,
  },
  formContainer: {
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.gold,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.gold,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.background,
  },
  listContainer: {
    marginTop: 8,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gold,
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gold,
  },
  questionDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  questionText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 12,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gold,
  },
  answerContainer: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  answerHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.gold,
  },
  answerText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
  },
  answerDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
