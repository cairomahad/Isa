import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const { session, setSession, setUser, setCity } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Load saved city
    AsyncStorage.getItem('selected_city').then((city) => {
      if (city) setCity(city);
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('app_user_id', session.user.id)
          .single();
        if (data) {
          setUser(data);
          if (data.city) setCity(data.city);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === 'admin';
    if (inAdminGroup) return;

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="lesson/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin/index" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
