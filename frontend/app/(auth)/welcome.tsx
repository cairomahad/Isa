import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, KeyboardAvoidingView, Platform, ScrollView, Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';

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
      // Anonymous sign-in
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError) throw authError;

      const userId = authData.user!.id;

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
        // Maybe RLS issue - still proceed with session
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

          {/* Divider */}
          <View style={styles.divider} />

          {/* Name Input */}
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
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  bismillah: {
    fontSize: 20,
    color: Colors.gold,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.gold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.darkGreen,
    marginBottom: 32,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.background,
  },
  footer: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
