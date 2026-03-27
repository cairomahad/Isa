import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { CITIES } from '../../constants/cities';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, setUser, session, selectedCity, setCity, setAdmin } = useAuthStore();
  const [name, setName] = useState(user?.display_name || '');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [notifs, setNotifs] = useState(user?.notifications_enabled ?? true);
  const [adminCode, setAdminCode] = useState('');
  const [showAdminInput, setShowAdminInput] = useState(false);

  const saveName = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      Alert.alert('Ошибка', 'Имя должно быть от 2 до 30 символов');
      return;
    }
    setSavingName(true);
    try {
      if (session?.user?.id) {
        await supabase
          .from('users')
          .update({ display_name: trimmed })
          .eq('app_user_id', session.user.id);
      }
      setUser({ ...user!, display_name: trimmed });
      setEditingName(false);
      Alert.alert('Готово', 'Имя обновлено');
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось сохранить');
    } finally {
      setSavingName(false);
    }
  };

  const toggleNotifs = async (val: boolean) => {
    setNotifs(val);
    if (session?.user?.id) {
      await supabase
        .from('users')
        .update({ notifications_enabled: val })
        .eq('app_user_id', session.user.id);
    }
    setUser({ ...user!, notifications_enabled: val });
  };

  const handleAdminLogin = () => {
    const adminPassword = process.env.EXPO_PUBLIC_ADMIN_PASSWORD || 'admin2024';
    if (adminCode === adminPassword) {
      setAdmin(true);
      setShowAdminInput(false);
      setAdminCode('');
      router.push('/admin');
    } else {
      Alert.alert('Ошибка', 'Неверный пароль');
    }
  };

  const signOut = async () => {
    Alert.alert('Выход', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          await AsyncStorage.removeItem('selected_city');
        },
      },
    ]);
  };

  const cityFromList = CITIES.find((c) => c.label === selectedCity) || CITIES[0];

  const Section = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const Row = ({
    icon, label, value, onPress, rightEl, testId,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    value?: string;
    onPress?: () => void;
    rightEl?: React.ReactNode;
    testId?: string;
  }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      testID={testId}
    >
      <Ionicons name={icon} size={20} color={Colors.gold} style={styles.rowIcon} />
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value && <Text style={styles.rowValue}>{value}</Text>}
      </View>
      {rightEl || (onPress && <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Настройки</Text>

          {/* Profile */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.display_name || 'А').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              {editingName ? (
                <View style={styles.nameEdit}>
                  <TextInput
                    style={styles.nameInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ваше имя"
                    placeholderTextColor={Colors.textSecondary}
                    maxLength={30}
                    autoFocus
                    testID="edit-name-input"
                  />
                  <TouchableOpacity style={styles.saveBtn} onPress={saveName} disabled={savingName} testID="save-name-btn">
                    {savingName ? (
                      <ActivityIndicator size="small" color={Colors.background} />
                    ) : (
                      <Text style={styles.saveBtnText}>Сохранить</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.profileName}>{user?.display_name || 'Студент'}</Text>
                  <TouchableOpacity onPress={() => setEditingName(true)} testID="edit-name-btn">
                    <Text style={styles.editLink}>Изменить имя</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user?.points || 0}</Text>
              <Text style={styles.statLabel}>Очки</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{selectedCity}</Text>
              <Text style={styles.statLabel}>Город</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—'}
              </Text>
              <Text style={styles.statLabel}>Дата входа</Text>
            </View>
          </View>

          {/* General */}
          <Section title="Общие" />
          <View style={styles.card}>
            <Row
              icon="location"
              label="Город намазов"
              value={selectedCity}
              testId="city-setting"
            />
            <View style={styles.rowDivider} />
            <View style={styles.row}>
              <Ionicons name="notifications" size={20} color={Colors.gold} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Уведомления</Text>
              </View>
              <Switch
                value={notifs}
                onValueChange={toggleNotifs}
                trackColor={{ false: Colors.darkGreen, true: Colors.gold }}
                thumbColor={Colors.textPrimary}
                testID="notifications-toggle"
              />
            </View>
          </View>

          {/* Admin */}
          <Section title="Для преподавателей" />
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowAdminInput(!showAdminInput)}
              testID="admin-section-btn"
            >
              <Ionicons name="shield" size={20} color={Colors.gold} style={styles.rowIcon} />
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Панель администратора</Text>
              </View>
              <Ionicons name={showAdminInput ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            {showAdminInput && (
              <View style={styles.adminInputRow}>
                <TextInput
                  style={styles.adminInput}
                  value={adminCode}
                  onChangeText={setAdminCode}
                  placeholder="Введите пароль"
                  placeholderTextColor={Colors.textSecondary}
                  secureTextEntry
                  testID="admin-password-input"
                />
                <TouchableOpacity style={styles.adminBtn} onPress={handleAdminLogin} testID="admin-login-btn">
                  <Text style={styles.adminBtnText}>Войти</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut} testID="sign-out-btn">
            <Ionicons name="log-out" size={18} color={Colors.error} />
            <Text style={styles.signOutText}>Выйти из аккаунта</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Tazakkur v1.0.0</Text>
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary, paddingTop: 16, marginBottom: 20 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.mediumGreen,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary },
  editLink: { fontSize: 13, color: Colors.gold, marginTop: 4 },
  nameEdit: { gap: 8 },
  nameInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  saveBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: 'bold', color: Colors.background },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.cardLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: Colors.gold },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.darkGreen },
  sectionHeader: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  card: {
    backgroundColor: Colors.cardDark,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rowIcon: { marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, color: Colors.textPrimary },
  rowValue: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: Colors.darkGreen, marginHorizontal: 16 },
  adminInputRow: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  adminInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  adminBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBtnText: { fontSize: 14, fontWeight: 'bold', color: Colors.background },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    gap: 8,
  },
  signOutText: { fontSize: 16, color: Colors.error, fontWeight: '600' },
  version: { textAlign: 'center', color: Colors.textSecondary, fontSize: 12, marginBottom: 8 },
});
