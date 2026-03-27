import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

export type AppUser = {
  id: string;
  display_name: string;
  points: number;
  city?: string;
  is_admin?: boolean;
  notifications_enabled?: boolean;
  created_at?: string;
};

type AuthState = {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  selectedCity: string;
  setSession: (session: Session | null) => void;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setAdmin: (isAdmin: boolean) => void;
  setCity: (city: string) => void;
  updatePoints: (points: number) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  isAdmin: false,
  selectedCity: 'Москва',
  setSession: (session) => set({ session, isLoading: false }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setAdmin: (isAdmin) => set({ isAdmin }),
  setCity: (selectedCity) => set({ selectedCity }),
  updatePoints: (points) =>
    set((state) => ({
      user: state.user ? { ...state.user, points } : null,
    })),
}));
