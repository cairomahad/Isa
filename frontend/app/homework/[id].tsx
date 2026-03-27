import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// Mock Audio for build compatibility
const Audio = {
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  setAudioModeAsync: async () => {},
  Recording: {
    createAsync: async () => ({
      recording: {
        stopAndUnloadAsync: async () => {},
        getURI: () => 'mock_audio_uri',
      }
    }),
  },
  RecordingOptionsPresets: { HIGH_QUALITY: {} },
} as any;
import { Colors, Shadows } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

type Homework = {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  image_url?: string;
  max_audio_duration: number;
};

export default function HomeworkScreen() {
  const router = useRouter();
  const { id: lessonId } = useLocalSearchParams();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [homework, setHomework] = useState<Homework | null>(null);
  
  // Audio recording
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  
  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  
  useEffect(() => {
    fetchHomework();
    requestPermissions();
  }, []);
  
  const requestPermissions = async () => {
    await Audio.requestPermissionsAsync();
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    await ImagePicker.requestCameraPermissionsAsync();
  };
  
  const fetchHomework = async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${backendUrl}/api/homework/${lessonId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch homework');
      }
      
      const data = await response.json();
      
      if (data.homework) {
        setHomework(data.homework);
      } else {
        Alert.alert('Нет задания', 'Для этого урока нет домашнего задания');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить задание');
    } finally {
      setLoading(false);
    }
  };
  
  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Update duration every second
      const interval = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= (homework?.max_audio_duration || 300)) {
            stopRecording();
            clearInterval(interval);
          }
          return newDuration;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Ошибка', 'Не удалось начать запись');
    }
  };
  
  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };
  
  const deleteAudio = () => {
    setAudioUri(null);
    setRecordingDuration(0);
  };
  
  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Лимит', 'Максимум 5 фотографий');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };
  
  const takePhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('Лимит', 'Максимум 5 фотографий');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };
  
  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };
  
  const submitHomework = async () => {
    if (!audioUri && photos.length === 0) {
      Alert.alert('Ошибка', 'Добавьте хотя бы аудио-ответ или фотографию');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
      
      // In production, convert files to base64 or use FormData
      const response = await fetch(`${backendUrl}/api/homework/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          homework_id: homework?.id,
          audio_base64: audioUri ? 'audio_placeholder' : null,
          photos_base64: photos.map(() => 'photo_placeholder'),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to submit');
      }
      
      Alert.alert(
        'Успешно! ✅',
        data.message || 'Домашнее задание отправлено на проверку',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      
    } catch (error: any) {
      console.error('Error submitting homework:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось отправить задание');
    } finally {
      setSubmitting(false);
    }
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  
  if (!homework) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Задание не найдено</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Домашнее задание</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Task Info */}
        <View style={styles.taskCard}>
          <Text style={styles.taskTitle}>{homework.title}</Text>
          <Text style={styles.taskDescription}>{homework.description}</Text>
          
          {homework.image_url && (
            <Image source={{ uri: homework.image_url }} style={styles.taskImage} />
          )}
        </View>
        
        {/* Audio Recording */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="mic" size={20} color={Colors.primary} /> Голосовой ответ
          </Text>
          
          {!audioUri ? (
            <View style={styles.recordCard}>
              <Text style={styles.recordHint}>
                Максимальная длительность: {formatDuration(homework.max_audio_duration)}
              </Text>
              
              <TouchableOpacity
                style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={submitting}
              >
                <Ionicons
                  name={isRecording ? 'stop-circle' : 'mic-circle'}
                  size={64}
                  color={isRecording ? Colors.error : Colors.primary}
                />
                <Text style={styles.recordButtonText}>
                  {isRecording ? 'Остановить' : 'Начать запись'}
                </Text>
              </TouchableOpacity>
              
              {isRecording && (
                <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
              )}
            </View>
          ) : (
            <View style={styles.audioPreview}>
              <Ionicons name="musical-notes" size={32} color={Colors.primary} />
              <View style={styles.audioInfo}>
                <Text style={styles.audioTitle}>Аудио записано</Text>
                <Text style={styles.audioDuration}>{formatDuration(recordingDuration)}</Text>
              </View>
              <TouchableOpacity onPress={deleteAudio}>
                <Ionicons name="trash" size={24} color={Colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="images" size={20} color={Colors.primary} /> Фотографии ({photos.length}/5)
          </Text>
          
          <View style={styles.photosGrid}>
            {photos.map((uri, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.photoDelete}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            
            {photos.length < 5 && (
              <>
                <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                  <Ionicons name="images" size={32} color={Colors.primary} />
                  <Text style={styles.addPhotoText}>Галерея</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.addPhotoButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={32} color={Colors.primary} />
                  <Text style={styles.addPhotoText}>Камера</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        
        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={submitHomework}
          disabled={submitting || (!audioUri && photos.length === 0)}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Отправить на проверку</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.backgroundPage },
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
  
  taskCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
    ...Shadows.card,
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  taskDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  taskImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 16,
  },
  
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  
  recordCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    ...Shadows.card,
  },
  recordHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  recordButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  recordButtonActive: {
    opacity: 0.8,
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  recordingTime: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 16,
  },
  
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Shadows.card,
  },
  audioInfo: {
    flex: 1,
    marginLeft: 12,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  audioDuration: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    width: '30%',
    aspectRatio: 1,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoDelete: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  addPhotoButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
    ...Shadows.gold,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
