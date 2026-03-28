import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Typography } from '../../constants/colors';

import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001';

interface Hadith {
  id: string;
  arabic_text: string;
  russian_text: string;
  source?: string;
}

interface Story {
  id: string;
  title: string;
  text: string;
}

export default function ContentManagementScreen() {
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingHadith, setEditingHadith] = useState<Hadith | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const [hadithsRes, storiesRes] = await Promise.all([
        fetch(`${API_URL}/api/hadiths`),
        fetch(`${API_URL}/api/stories`),
      ]);

      const hadithsData = await hadithsRes.json();
      const storiesData = await storiesRes.json();

      setHadiths(hadithsData.hadiths || []);
      setStories(storiesData.stories || []);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchContent();
    setRefreshing(false);
  };

  const handleUpdateHadith = async () => {
    if (!editingHadith) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/hadith/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingHadith),
      });

      if (response.ok) {
        Alert.alert('Успех', 'Хадис обновлён');
        setEditingHadith(null);
        fetchContent();
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить хадис');
    }
  };

  const handleUpdateStory = async () => {
    if (!editingStory) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/story/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStory),
      });

      if (response.ok) {
        Alert.alert('Успех', 'История обновлена');
        setEditingStory(null);
        fetchContent();
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить историю');
    }
  };

  const handleDeleteHadith = async (id: string) => {
    Alert.alert('Удалить хадис?', 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/admin/hadith/${id}`, { method: 'DELETE' });
            Alert.alert('Успех', 'Хадис удалён');
            fetchContent();
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось удалить');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Управление контентом</Text>
        </View>

        {/* Hadiths Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 Хадисы ({hadiths.length})</Text>
          
          {hadiths.map((hadith) => (
            <View key={hadith.id} style={styles.contentCard}>
              {editingHadith?.id === hadith.id ? (
                <View style={styles.editForm}>
                  <Text style={styles.label}>Арабский текст:</Text>
                  <TextInput
                    style={[styles.input, styles.arabicInput]}
                    value={editingHadith.arabic_text}
                    onChangeText={(text) =>
                      setEditingHadith({ ...editingHadith, arabic_text: text })
                    }
                    multiline
                  />

                  <Text style={styles.label}>Русский перевод:</Text>
                  <TextInput
                    style={styles.input}
                    value={editingHadith.russian_text}
                    onChangeText={(text) =>
                      setEditingHadith({ ...editingHadith, russian_text: text })
                    }
                    multiline
                  />

                  <Text style={styles.label}>Источник:</Text>
                  <TextInput
                    style={styles.input}
                    value={editingHadith.source || ''}
                    onChangeText={(text) =>
                      setEditingHadith({ ...editingHadith, source: text })
                    }
                  />

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleUpdateHadith}
                    >
                      <Text style={styles.saveButtonText}>Сохранить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setEditingHadith(null)}
                    >
                      <Text style={styles.cancelButtonText}>Отмена</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.arabicText}>{hadith.arabic_text}</Text>
                  <Text style={styles.russianText}>{hadith.russian_text}</Text>
                  {hadith.source && (
                    <Text style={styles.sourceText}>Источник: {hadith.source}</Text>
                  )}
                  
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => setEditingHadith(hadith)}
                    >
                      <Ionicons name="pencil" size={18} color={Colors.primary} />
                      <Text style={styles.editButtonText}>Редактировать</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteHadith(hadith.id)}
                    >
                      <Ionicons name="trash" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Stories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Истории ({stories.length})</Text>
          
          {stories.map((story) => (
            <View key={story.id} style={styles.contentCard}>
              {editingStory?.id === story.id ? (
                <View style={styles.editForm}>
                  <Text style={styles.label}>Заголовок:</Text>
                  <TextInput
                    style={styles.input}
                    value={editingStory.title}
                    onChangeText={(text) =>
                      setEditingStory({ ...editingStory, title: text })
                    }
                  />

                  <Text style={styles.label}>Текст:</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 120 }]}
                    value={editingStory.text}
                    onChangeText={(text) =>
                      setEditingStory({ ...editingStory, text: text })
                    }
                    multiline
                  />

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleUpdateStory}
                    >
                      <Text style={styles.saveButtonText}>Сохранить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setEditingStory(null)}
                    >
                      <Text style={styles.cancelButtonText}>Отмена</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.storyTitle}>{story.title}</Text>
                  <Text style={styles.storyText} numberOfLines={3}>
                    {story.text}
                  </Text>
                  
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => setEditingStory(story)}
                    >
                      <Ionicons name="pencil" size={18} color={Colors.primary} />
                      <Text style={styles.editButtonText}>Редактировать</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  scroll: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    ...Typography.h1,
    fontSize: 26,
  },

  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    ...Typography.h2,
    marginBottom: 16,
  },

  contentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  arabicText: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'right',
  },
  russianText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 8,
  },
  sourceText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  storyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  deleteButton: {
    padding: 8,
  },

  editForm: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.backgroundPage,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
  },
  arabicInput: {
    textAlign: 'right',
    fontSize: 18,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
