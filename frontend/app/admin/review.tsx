import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/colors';

type Submission = {
  id: string;
  user_name: string;
  homework_title: string;
  submitted_at: string;
  audio_url?: string;
  photo_urls: string[];
  status: string;
  grade?: number;
  teacher_comment?: string;
};

export default function AdminReviewScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams(); // 'homework' or 'questions'
  
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedItem, setSelectedItem] = useState<Submission | null>(null);
  const [grade, setGrade] = useState('');
  const [comment, setComment] = useState('');
  const [reviewing, setReviewing] = useState(false);
  
  useEffect(() => {
    fetchItems();
  }, [type]);
  
  const fetchItems = async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001';
      const endpoint = type === 'homework' ? '/api/homework/submissions' : '/api/admin/questions';
      
      const response = await fetch(`${backendUrl}${endpoint}?status=pending`);
      const data = await response.json();
      
      setSubmissions(data.submissions || data.questions || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };
  
  const submitReview = async () => {
    if (!selectedItem) return;
    
    if (type === 'homework') {
      const gradeNum = parseInt(grade);
      if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
        Alert.alert('Ошибка', 'Оценка должна быть от 0 до 100');
        return;
      }
    }
    
    if (!comment.trim()) {
      Alert.alert('Ошибка', 'Добавьте комментарий');
      return;
    }
    
    setReviewing(true);
    
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001';
      const endpoint = type === 'homework' ? '/api/homework/review' : '/api/admin/answer-question';
      
      const body = type === 'homework'
        ? { submission_id: selectedItem.id, grade: parseInt(grade), comment }
        : { question_id: selectedItem.id, answer: comment };
      
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit review');
      }
      
      Alert.alert('Успешно!', 'Проверка завершена');
      setSelectedItem(null);
      setGrade('');
      setComment('');
      fetchItems();
      
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось отправить проверку');
    } finally {
      setReviewing(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'homework' ? 'Проверка ДЗ' : 'Вопросы студентов'}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.scroll}>
        {submissions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.green} />
            <Text style={styles.emptyText}>
              {type === 'homework' ? 'Все задания проверены!' : 'Нет новых вопросов'}
            </Text>
          </View>
        ) : (
          submissions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemCard}
              onPress={() => setSelectedItem(item)}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.user_name}</Text>
                <Text style={styles.itemDate}>
                  {new Date(item.submitted_at || item.created_at).toLocaleDateString('ru-RU')}
                </Text>
              </View>
              
              <Text style={styles.itemSubtitle}>
                {type === 'homework' ? item.homework_title : item.question}
              </Text>
              
              <View style={styles.itemMeta}>
                {item.audio_url && (
                  <View style={styles.metaItem}>
                    <Ionicons name="mic" size={16} color={Colors.primary} />
                    <Text style={styles.metaText}>Аудио</Text>
                  </View>
                )}
                {item.photo_urls && item.photo_urls.length > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="images" size={16} color={Colors.primary} />
                    <Text style={styles.metaText}>{item.photo_urls.length} фото</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      
      {/* Review Modal */}
      {selectedItem && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Проверка</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Ionicons name="close" size={28} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalLabel}>Студент</Text>
              <Text style={styles.modalValue}>{selectedItem.user_name}</Text>
              
              {type === 'homework' && (
                <>
                  <Text style={styles.modalLabel}>Задание</Text>
                  <Text style={styles.modalValue}>{selectedItem.homework_title}</Text>
                  
                  <Text style={styles.modalLabel}>Оценка (0-100)</Text>
                  <TextInput
                    style={styles.input}
                    value={grade}
                    onChangeText={setGrade}
                    keyboardType="number-pad"
                    placeholder="Введите оценку"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </>
              )}
              
              {type === 'questions' && (
                <>
                  <Text style={styles.modalLabel}>Вопрос</Text>
                  <Text style={styles.modalValue}>{selectedItem.question}</Text>
                </>
              )}
              
              <Text style={styles.modalLabel}>
                {type === 'homework' ? 'Комментарий' : 'Ответ'}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={comment}
                onChangeText={setComment}
                placeholder={type === 'homework' ? 'Напишите комментарий' : 'Напишите ответ'}
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              
              <TouchableOpacity
                style={[styles.submitBtn, reviewing && styles.submitBtnDisabled]}
                onPress={submitReview}
                disabled={reviewing}
              >
                {reviewing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Отправить</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scroll: { flex: 1, paddingHorizontal: 20 },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    ...Shadows.card,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemDate: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  itemSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalScroll: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  modalValue: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.backgroundPage,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 120,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    ...Shadows.gold,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
