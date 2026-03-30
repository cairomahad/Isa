import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../contexts/ThemeContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

export default function RootLayout() {
  const { session, setSession, setUser, setCity, setLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load saved city
    AsyncStorage.getItem('selected_city').then((city) => {
      if (city) setCity(city);
    });

    const restoreSession = async () => {
      // 1. Try Supabase session (for future OAuth/email auth)
      const { data: { session: supaSession } } = await supabase.auth.getSession();
      if (supaSession) {
        setSession(supaSession);
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('app_user_id', supaSession.user.id)
          .single();
        if (data) {
          setUser(data);
          if (data.city) setCity(data.city);
        }
        return;
      }

      // 2. Try cached custom auth session (phone+password login)
      const cachedUserStr = await AsyncStorage.getItem('cached_user');
      const cachedSessionId = await AsyncStorage.getItem('cached_session_id');

      if (cachedUserStr && cachedSessionId) {
        try {
          const cachedUser = JSON.parse(cachedUserStr);
          // Restore session immediately from cache (fast)
          setSession({ user: { id: cachedUser.id, phone: cachedUser.phone } } as any);
          setUser(cachedUser);
          if (cachedUser.city) setCity(cachedUser.city);

          // Silently refresh user data from backend in background
          try {
            const res = await fetch(`${API_URL}/api/profile/${cachedUser.id}`);
            if (res.ok) {
              const fresh = await res.json();
              const freshUser = {
                ...cachedUser,
                display_name: fresh?.user?.name || cachedUser.display_name,
                points: fresh?.user?.points ?? cachedUser.points,
              };
              setUser(freshUser);
              await AsyncStorage.setItem('cached_user', JSON.stringify(freshUser));
            }
          } catch (_) {
            // Network error — keep cached data, user stays logged in
          }
          return;
        } catch (_) {
          // Corrupt cache — clear and show login
          await AsyncStorage.multiRemove(['cached_user', 'cached_session_id']);
        }
      }

      // 3. Fallback: legacy local_user_id
      const localId = await AsyncStorage.getItem('local_user_id');
      if (localId) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('app_user_id', localId)
          .single();
        if (data) {
          setUser(data);
          setSession({ user: { id: localId } } as any);
          if (data.city) setCity(data.city);
          return;
        }
      }

      // Nothing found — show login screen
      setLoading(false);
    };

    restoreSession();

    // Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setSession(session);
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

  // Wait for navigation to be ready
  useEffect(() => {
    if (navigationState?.key && !isReady) {
      setIsReady(true);
    }
  }, [navigationState?.key]);

  // Handle navigation redirects only after layout is mounted
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === 'admin';
    if (inAdminGroup) return;

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments, isReady]);

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="lesson/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="admin/index" options={{ presentation: 'modal' }} />
        <Stack.Screen name="quran/settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="quran/lesson" options={{ presentation: 'card' }} />
        <Stack.Screen name="quran/review" options={{ presentation: 'card' }} />
        <Stack.Screen name="quran/progress" options={{ presentation: 'card' }} />
      </Stack>
    </ThemeProvider>
  );
}
