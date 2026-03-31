import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Shadows } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setSession, setUser } = useAuthStore();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) { Alert.alert('Ошибка', 'Введите email'); return; }
    if (!password.trim() || password.length < 4) { Alert.alert('Ошибка', 'Пароль не менее 4 символов'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Неверный email или пароль');

      const userData = {
        id: data.user_id,
        phone: data.phone || '',
        display_name: data.display_name,
        role: data.role,
        points: data.points || 0,
      };
      await AsyncStorage.setItem('cached_user', JSON.stringify(userData));
      await AsyncStorage.setItem('cached_session_id', data.user_id);
      setSession({ user: { id: data.user_id } } as any);
      setUser(userData);

      if (data.role === 'admin') {
        router.replace('/admin' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    } catch (e: any) {
      Alert.alert('Ошибка входа', e.message || 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !email.includes('@')) { Alert.alert('Ошибка', 'Введите корректный email'); return; }
    if (!name.trim() || name.trim().length < 2) { Alert.alert('Ошибка', 'Введите ваше имя'); return; }
    if (!password.trim() || password.length < 6) { Alert.alert('Ошибка', 'Пароль не менее 6 символов'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: password.trim(), name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка регистрации');

      const userData = {
        id: data.user_id,
        phone: '',
        display_name: data.display_name,
        role: data.role,
        points: 0,
      };
      await AsyncStorage.setItem('cached_user', JSON.stringify(userData));
      await AsyncStorage.setItem('cached_session_id', data.user_id);
      setSession({ user: { id: data.user_id } } as any);
      setUser(userData);
      router.replace('/(tabs)' as any);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>

          <Image
            source={require('../../assets/images/mosque-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            testID="mosque-logo"
          />

          <Text style={styles.appName}>Tazakkur</Text>
          <Text style={styles.subtitle}>Исламское приложение для мусульман</Text>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
              onPress={() => setTab('login')}
              testID="tab-login"
            >
              <Text style={[styles.tabBtnText, tab === 'login' && styles.tabBtnTextActive]}>Вход</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
              onPress={() => setTab('register')}
              testID="tab-register"
            >
              <Text style={[styles.tabBtnText, tab === 'register' && styles.tabBtnTextActive]}>Регистрация</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.label}>{tab === 'login' ? 'Вход в систему' : 'Создать аккаунт'}</Text>

            {tab === 'register' && (
              <TextInput
                testID="name-input"
                style={styles.input}
                placeholder="Ваше имя"
                placeholderTextColor={Colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            )}

            <TextInput
              testID="email-input"
              style={[styles.input, tab === 'register' && { marginTop: 12 }]}
              placeholder="Email"
              placeholderTextColor={Colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              testID="password-input"
              style={[styles.input, { marginTop: 12 }]}
              placeholder={tab === 'register' ? 'Пароль (мин. 6 символов)' : 'Пароль'}
              placeholderTextColor={Colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            testID="submit-button"
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={tab === 'login' ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{tab === 'login' ? 'Войти' : 'Зарегистрироваться'}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footer}>
            {tab === 'login'
              ? 'Нет аккаунта? Нажмите "Регистрация"'
              : 'Уже есть аккаунт? Нажмите "Вход"'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  bismillah: {
    fontSize: 22, color: Colors.primary, textAlign: 'center',
    marginBottom: 32, fontWeight: '600',
  },
  logo: { width: 160, height: 160, marginBottom: 16 },
  appName: {
    fontSize: 36, fontWeight: '700', color: Colors.textPrimary,
    letterSpacing: -0.5, marginBottom: 6,
  },
  subtitle: {
    fontSize: 15, color: Colors.textSecondary, textAlign: 'center',
    marginBottom: 32, fontWeight: '500',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundPage,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    width: '100%',
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  tabBtnTextActive: { color: '#fff' },
  inputCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    ...Shadows.card,
  },
  label: {
    fontSize: 15, color: Colors.textPrimary, marginBottom: 16,
    fontWeight: '600', textAlign: 'center',
  },
  input: {
    width: '100%', height: 52, backgroundColor: Colors.backgroundPage,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 16, fontSize: 16, color: Colors.textPrimary,
  },
  button: {
    width: '100%', height: 54, backgroundColor: Colors.primary,
    borderRadius: 30, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, ...Shadows.gold,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  footer: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500' },
});
