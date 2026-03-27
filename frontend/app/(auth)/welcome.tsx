import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, KeyboardAvoidingView, Platform, ScrollView, Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';

// Simple UUID v4 generator (no external dependency)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export default function WelcomeScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setSession, setUser } = useAuthStore();

  const handleStart = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      Alert.alert('Ошибка', 'Имя должно быть от 2 до 30 символов');
      return;
    }

    setLoading(true);
    try {
      let userId: string;
      let isFirstTime = false;

      // Try Supabase anonymous sign-in
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      
      if (authError) {
        // Fallback: use local UUID (if anonymous sign-ins are disabled in Supabase)
        console.warn('Anonymous auth failed, using local UUID fallback:', authError.message);
        let localId = await AsyncStorage.getItem('local_user_id');
        if (!localId) {
          localId = generateUUID();
          await AsyncStorage.setItem('local_user_id', localId);
          isFirstTime = true;
        }
        userId = localId;

        // Try to find existing user by local ID
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('app_user_id', userId)
          .single();

        if (existingUser) {
          setUser(existingUser);
          // Create a mock session
          const mockSession = { user: { id: userId } } as any;
          setSession(mockSession);
          router.replace('/(tabs)');
          return;
        }

        // Create new user
        const { data: newUser } = await supabase
          .from('users')
          .insert([{ display_name: trimmed, app_user_id: userId, points: 0, city: 'Москва', notifications_enabled: true }])
          .select()
          .single();

        setUser(newUser || { id: userId, display_name: trimmed, points: 0, city: 'Москва' });
        const mockSession = { user: { id: userId } } as any;
        setSession(mockSession);
        router.replace('/(auth)/onboarding');
        return;
      }

      userId = authData.user!.id;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('app_user_id', userId)
        .single();

      if (existingUser) {
        setUser(existingUser);
        setSession(authData.session);
        router.replace('/(tabs)');
        return;
      }

      // Create new user record
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          display_name: trimmed,
          app_user_id: userId,
          points: 0,
          city: 'Москва',
          notifications_enabled: true,
        }])
        .select()
        .single();

      if (insertError) {
        console.warn('Insert error:', insertError.message);
      }

      setUser(newUser || { id: userId, display_name: trimmed, points: 0 });
      setSession(authData.session);
      router.replace('/(auth)/onboarding');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Ошибка', err.message || 'Не удалось войти. Попробуйте снова.');
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
          {/* Bismillah */}
          <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</Text>

          {/* Logo */}
          <Image
            source={require('../../assets/images/mosque-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            testID="mosque-logo"
          />

          {/* App Name */}
          <Text style={styles.appName}>Tazakkur</Text>
          <Text style={styles.subtitle}>Исламское приложение для мусульман</Text>

          {/* Name Input Card */}
          <View style={styles.inputCard}>
            <Text style={styles.label}>Введите ваше имя</Text>
            <TextInput
              testID="name-input"
              style={styles.input}
              placeholder="Имя (2–30 символов)"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={30}
              autoCorrect={false}
            />
          </View>

          {/* Button */}
          <TouchableOpacity
            testID="start-button"
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleStart}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.buttonText}>Начать</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footer}>
            Авторизация анонимная — без телефона и email
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
    marginBottom: 12,
    fontWeight: '600',
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
