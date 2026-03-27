import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Modal,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../constants/colors';

type Lesson = {
  id: string;
  title: string;
  description: string;
  category: string;
  video_file_id?: string;
  audio_file_id?: string;
  pdf_file_id?: string;
  created_at: string;
};

const CATEGORIES = [
  { value: 'fard', label: 'Шафиитский мазхаб', emoji: '📘' },
  { value: 'hanafi', label: 'Ханафитский мазхаб', emoji: '📗' },
  { value: 'arabic', label: 'Арабский язык', emoji: '🔤' },
  { value: 'family', label: 'Семейные отношения', emoji: '🏠' },
];

export default function ManageLessonsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('fard');
  const [videoFileId, setVideoFileId] = useState('');
  const [audioFileId, setAudioFileId] = useState('');
  const [pdfFileId, setPdfFileId] = useState('');
  
  useEffect(() => {
    fetchLessons();
  }, []);
  
  const fetchLessons = async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${backendUrl}/api/admin/lessons`);
      const data = await response.json();
      
      setLessons(data.lessons || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить уроки');
    } finally {
      setLoading(false);
    }
  };
  
  const openAddModal = () => {
    setEditingLesson(null);
    setTitle('');
    setDescription('');
    setCategory('fard');
    setVideoFileId('');
    setAudioFileId('');
    setPdfFileId('');
    setShowModal(true);
  };
  
  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setTitle(lesson.title);
    setDescription(lesson.description);
    setCategory(lesson.category);
    setVideoFileId(lesson.video_file_id || '');
    setAudioFileId(lesson.audio_file_id || '');
    setPdfFileId(lesson.pdf_file_id || '');
    setShowModal(true);
  };
  
  const saveLesson = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название урока');
      return;
    }
    
    setSaving(true);
    
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      
      if (editingLesson) {
        // Update existing lesson
        const response = await fetch(`${backendUrl}/api/admin/lessons/${editingLesson.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            category,
            video_file_id: videoFileId || null,
            audio_file_id: audioFileId || null,
            pdf_file_id: pdfFileId || null,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.detail || 'Failed to update');
        }
        
        Alert.alert('Успешно!', data.message);
      } else {
        // Create new lesson
        const response = await fetch(`${backendUrl}/api/admin/lessons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            category,
            video_file_id: videoFileId || null,
            audio_file_id: audioFileId || null,
            pdf_file_id: pdfFileId || null,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.detail || 'Failed to create');
        }
        
        Alert.alert('Успешно!', data.message);
      }
      
      setShowModal(false);
      fetchLessons();
      
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить урок');
    } finally {
      setSaving(false);
    }
  };
  
  const deleteLesson = (lesson: Lesson) => {
    Alert.alert(
      'Удалить урок?',
      `Вы уверены, что хотите удалить урок "${lesson.title}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
              const response = await fetch(`${backendUrl}/api/admin/lessons/${lesson.id}`, {
                method: 'DELETE',
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.detail || 'Failed to delete');
              }
              
              Alert.alert('Успешно!', data.message);
              fetchLessons();
              
            } catch (error: any) {
              Alert.alert('Ошибка', error.message || 'Не удалось удалить урок');
            }
          },
        },
      ]
    );
  };
  
  const getCategoryLabel = (value: string) => {
    const cat = CATEGORIES.find(c => c.value === value);
    return cat ? `${cat.emoji} ${cat.label}` : value;
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
        <Text style={styles.headerTitle}>Управление уроками</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scroll}>
        {lessons.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Уроков пока нет</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
              <Text style={styles.emptyButtonText}>Добавить первый урок</Text>
            </TouchableOpacity>
          </View>
        ) : (
          lessons.map((lesson) => (
            <View key={lesson.id} style={styles.lessonCard}>
              <View style={styles.lessonHeader}>
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.lessonCategory}>
                    {getCategoryLabel(lesson.category)}
                  </Text>
                  {lesson.description && (
                    <Text style={styles.lessonDescription} numberOfLines={2}>
                      {lesson.description}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.lessonMeta}>
                {lesson.video_file_id && (
                  <View style={styles.metaTag}>
                    <Ionicons name="videocam" size={14} color={Colors.primary} />
                    <Text style={styles.metaText}>Видео</Text>
                  </View>
                )}
                {lesson.audio_file_id && (
                  <View style={styles.metaTag}>
                    <Ionicons name="musical-note" size={14} color={Colors.primary} />
                    <Text style={styles.metaText}>Аудио</Text>
                  </View>
                )}
                {lesson.pdf_file_id && (
                  <View style={styles.metaTag}>
                    <Ionicons name="document" size={14} color={Colors.primary} />
                    <Text style={styles.metaText}>PDF</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.lessonActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(lesson)}
                >
                  <Ionicons name="create-outline" size={20} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>Редактировать</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteLesson(lesson)}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  <Text style={[styles.actionButtonText, styles.deleteText]}>Удалить</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
      
      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingLesson ? 'Редактировать урок' : 'Новый урок'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Название урока *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Например: Условия намаза"
                placeholderTextColor={Colors.textSecondary}
              />
              
              <Text style={styles.label}>Описание</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Краткое описание урока"
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={3}
              />
              
              <Text style={styles.label}>Категория *</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryCard,
                      category === cat.value && styles.categoryCardActive,
                    ]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.sectionTitle}>Файлы (ID из Telegram или URL)</Text>
              
              <Text style={styles.label}>Видео File ID</Text>
              <TextInput
                style={styles.input}
                value={videoFileId}
                onChangeText={setVideoFileId}
                placeholder="Telegram file_id или URL"
                placeholderTextColor={Colors.textSecondary}
              />
              
              <Text style={styles.label}>Аудио File ID</Text>
              <TextInput
                style={styles.input}
                value={audioFileId}
                onChangeText={setAudioFileId}
                placeholder="Telegram file_id или URL"
                placeholderTextColor={Colors.textSecondary}
              />
              
              <Text style={styles.label}>PDF File ID</Text>
              <TextInput
                style={styles.input}
                value={pdfFileId}
                onChangeText={setPdfFileId}
                placeholder="Telegram file_id или URL"
                placeholderTextColor={Colors.textSecondary}
              />
              
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={saveLesson}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingLesson ? 'Сохранить изменения' : 'Создать урок'}
                  </Text>
                )}
              </TouchableOpacity>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.goldBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1, paddingHorizontal: 20 },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  lessonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    ...Shadows.card,
  },
  lessonHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  lessonCategory: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  lessonDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  lessonMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.goldBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  lessonActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.goldBackground,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteText: {
    color: Colors.error,
  },
  
  modalOverlay: {
    flex: 1,
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
  
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 24,
    marginBottom: 8,
  },
  
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: Colors.backgroundPage,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  categoryCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.goldBackground,
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    ...Shadows.gold,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
