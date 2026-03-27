import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import { Colors, Shadows } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setSession, setUser } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim()) {
      Alert.alert('Ошибка', 'Введите номер телефона');
      return;
    }

    if (!password.trim() || password.trim().length < 4) {
      Alert.alert('Ошибка', 'Пароль должен быть минимум 4 символа');
      return;
    }

    setLoading(true);

    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-islamic.preview.emergentagent.com';
      
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Неверный телефон или пароль');
      }

      setSession({ user: { id: data.user_id, phone: data.phone } });
      setUser({
        id: data.user_id,
        phone: data.phone,
        display_name: data.display_name,
        role: data.role,
        points: data.points || 0,
      });

      if (data.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Ошибка входа', error.message || 'Не удалось войти. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>

          <Image
            source={require('../../assets/images/mosque-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            testID="mosque-logo"
          />

          <Text style={styles.appName}>Tazakkur</Text>
          <Text style={styles.subtitle}>Исламское приложение для мусульман</Text>

          <View style={styles.inputCard}>
            <Text style={styles.label}>Вход в систему</Text>
            
            <TextInput
              testID="phone-input"
              style={styles.input}
              placeholder="Номер телефона"
              placeholderTextColor={Colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={15}
              autoCorrect={false}
            />

            <TextInput
              testID="password-input"
              style={[styles.input, { marginTop: 12 }]}
              placeholder="Пароль"
              placeholderTextColor={Colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              maxLength={50}
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            testID="login-button"
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Войти</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footer}>
            Для регистрации обратитесь к администратору
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
    fontSize: 22,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '600',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  appName: {
    fontSize: 38,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
    fontWeight: '500',
  },
  inputCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    ...Shadows.card,
  },
  label: {
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.backgroundPage,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  button: {
    width: '100%',
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Shadows.gold,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footer: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});
