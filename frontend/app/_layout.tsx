import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

    // Check for local UUID fallback (when anonymous auth is disabled)
    const checkLocalAuth = async () => {
      const localId = await AsyncStorage.getItem('local_user_id');
      if (localId) {
        // Try to load user from Supabase
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('app_user_id', localId)
          .single();
        if (data) {
          setUser(data);
          setSession({ user: { id: localId } } as any);
          if (data.city) setCity(data.city);
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        // Load user data
        supabase
          .from('users')
          .select('*')
          .eq('app_user_id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUser(data);
              if (data.city) setCity(data.city);
            }
          });
      } else {
        // No Supabase session - check local fallback
        checkLocalAuth().then(() => {
          // Done checking - mark loading complete (don't reset session if set by welcome screen)
          setLoading(false);
        });
      }
    });

    // Listen to auth changes
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="lesson/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin/index" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
