import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { useUmmaStore, NewPostData } from '../../store/ummaStore';

type PostType = 'text' | 'quote' | 'question';

interface Props {
  visible: boolean;
  userId: string;
  onClose: () => void;
}

const TYPE_OPTIONS: { key: PostType; label: string; icon: any; desc: string }[] = [
  { key: 'text', label: 'Пост', icon: 'create-outline', desc: 'Поделитесь мыслью' },
  { key: 'quote', label: 'Цитата', icon: 'book-outline', desc: 'Аят или хадис' },
  { key: 'question', label: 'Вопрос', icon: 'help-circle-outline', desc: 'Задать умме' },
];

export default function NewPostModal({ visible, userId, onClose }: Props) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { createPost } = useUmmaStore();

  const [type, setType] = useState<PostType>('text');
  const [body, setBody] = useState('');
  const [arabicText, setArabicText] = useState('');
  const [source, setSource] = useState('');
  const [sending, setSending] = useState(false);

  // Slide-up animation
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 50 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const reset = () => {
    setBody('');
    setArabicText('');
    setSource('');
    setType('text');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (trimmed.length < 3) {
      Alert.alert('Ошибка', 'Напишите хотя бы несколько слов');
      return;
    }

    setSending(true);
    try {
      const data: NewPostData = {
        user_id: userId,
        type,
        body: trimmed,
        arabic_text: type === 'quote' && arabicText.trim() ? arabicText.trim() : undefined,
        source: type === 'quote' && source.trim() ? source.trim() : undefined,
      };
      await createPost(data);
      reset();
      onClose();
    } catch (e: any) {
      if (e.message?.includes('403') || e.message?.includes('курс')) {
        Alert.alert('Нет доступа', 'Завершите Шафиитский или Ханафитский мазхаб, чтобы публиковать посты');
      } else {
        Alert.alert('Ошибка', e.message || 'Не удалось опубликовать');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} onPress={handleClose} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Новая публикация</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} testID="close-modal-btn">
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Type selector */}
              <View style={styles.typeRow}>
                {TYPE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.typeBtn, type === opt.key && styles.typeBtnActive]}
                    onPress={() => setType(opt.key)}
                    testID={`type-${opt.key}-btn`}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={type === opt.key ? Colors.primary : Colors.textSecondary}
                    />
                    <Text style={[styles.typeBtnText, type === opt.key && { color: Colors.primary }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Main text */}
              <TextInput
                style={styles.bodyInput}
                placeholder={
                  type === 'quote' ? 'Пояснение к цитате...' :
                  type === 'question' ? 'Опишите вопрос подробнее...' :
                  'Поделитесь размышлением...'
                }
                placeholderTextColor={Colors.textSecondary}
                value={body}
                onChangeText={setBody}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                testID="post-body-input"
              />
              <Text style={styles.charCount}>{body.length}/1000</Text>

              {/* Quote fields */}
              {type === 'quote' && (
                <>
                  <Text style={styles.fieldLabel}>Арабский текст</Text>
                  <TextInput
                    style={[styles.bodyInput, styles.arabicInput]}
                    placeholder="أَعُوذُ بِاللَّهِ..."
                    placeholderTextColor={Colors.textSecondary}
                    value={arabicText}
                    onChangeText={setArabicText}
                    multiline
                    textAlign="right"
                    testID="arabic-text-input"
                  />

                  <Text style={styles.fieldLabel}>Источник</Text>
                  <TextInput
                    style={styles.sourceInput}
                    placeholder="Например: Аль-Бухари 1234"
                    placeholderTextColor={Colors.textSecondary}
                    value={source}
                    onChangeText={setSource}
                    testID="source-input"
                  />
                </>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, (sending || body.trim().length < 3) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={sending || body.trim().length < 3}
                testID="submit-post-btn"
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.submitText}>Опубликовать</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 32 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  closeBtn: { padding: 4 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.backgroundPage, borderWidth: 1.5, borderColor: Colors.border,
  },
  typeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.goldBackground || Colors.backgroundPage },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  bodyInput: {
    backgroundColor: Colors.backgroundPage,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  charCount: { fontSize: 11, color: Colors.textTertiary, textAlign: 'right', marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
  arabicInput: {
    fontSize: 22, textAlign: 'right', lineHeight: 36,
    minHeight: 80, marginBottom: 4,
  },
  sourceInput: {
    backgroundColor: Colors.backgroundPage, borderRadius: 12, padding: 12,
    fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
    marginBottom: 16,
  },
  submitBtn: {
    flexDirection: 'row', backgroundColor: Colors.primary, borderRadius: 14,
    padding: 16, alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 8, ...Shadows.gold,
  },
  submitBtnDisabled: { backgroundColor: Colors.border },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
