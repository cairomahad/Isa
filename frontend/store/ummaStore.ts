import { create } from 'zustand';

const API = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-production-c8c9.up.railway.app';

export interface UmmaPost {
  id: string;
  user_id: string;
  author_name: string;
  type: 'text' | 'quote' | 'question';
  body: string;
  arabic_text?: string;
  source?: string;
  likes_count: number;
  is_liked: boolean;
  created_at: string;
}

export interface NewPostData {
  user_id: string;
  type: 'text' | 'quote' | 'question';
  body: string;
  arabic_text?: string;
  source?: string;
}

interface UmmaState {
  posts: UmmaPost[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  canPost: boolean;
  canPostChecked: boolean;

  fetchPosts: (userId: string, reset?: boolean) => Promise<void>;
  fetchNextPage: (userId: string) => Promise<void>;
  checkCanPost: (userId: string) => Promise<void>;
  toggleLike: (postId: string, userId: string) => Promise<void>;
  createPost: (data: NewPostData) => Promise<UmmaPost>;
  deletePost: (postId: string, userId: string) => Promise<void>;
}

export const useUmmaStore = create<UmmaState>((set, get) => ({
  posts: [],
  page: 1,
  hasMore: true,
  isLoading: false,
  canPost: false,
  canPostChecked: false,

  fetchPosts: async (userId, reset = true) => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const page = reset ? 1 : get().page;
      const url = `${API}/api/umma/feed?page=${page}&limit=20&user_id=${userId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Feed fetch failed');
      const data = await res.json();
      const incoming: UmmaPost[] = data.posts || [];
      set({
        posts: reset ? incoming : [...get().posts, ...incoming],
        page: page + 1,
        hasMore: data.has_more ?? incoming.length === 20,
      });
    } catch (e) {
      console.warn('fetchPosts error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchNextPage: async (userId) => {
    if (!get().hasMore || get().isLoading) return;
    await get().fetchPosts(userId, false);
  },

  checkCanPost: async (userId) => {
    if (get().canPostChecked) return;
    try {
      const res = await fetch(`${API}/api/umma/can-post?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        set({ canPost: data.can_post, canPostChecked: true });
      }
    } catch (e) {
      console.warn('checkCanPost error:', e);
    }
  },

  toggleLike: async (postId, userId) => {
    // Optimistic update
    set(state => ({
      posts: state.posts.map(p =>
        p.id === postId
          ? { ...p, is_liked: !p.is_liked, likes_count: p.likes_count + (p.is_liked ? -1 : 1) }
          : p
      ),
    }));

    try {
      const res = await fetch(`${API}/api/umma/post/${postId}/like?user_id=${userId}`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        set(state => ({
          posts: state.posts.map(p =>
            p.id === postId
              ? { ...p, is_liked: data.liked, likes_count: data.likes_count }
              : p
          ),
        }));
      }
    } catch {
      // Revert optimistic update on failure
      set(state => ({
        posts: state.posts.map(p =>
          p.id === postId
            ? { ...p, is_liked: !p.is_liked, likes_count: p.likes_count + (p.is_liked ? -1 : 1) }
            : p
        ),
      }));
    }
  },

  createPost: async (data) => {
    const res = await fetch(`${API}/api/umma/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail || 'Ошибка создания поста');
    const newPost: UmmaPost = json;
    set(state => ({ posts: [newPost, ...state.posts] }));
    return newPost;
  },

  deletePost: async (postId, userId) => {
    const res = await fetch(`${API}/api/umma/post/${postId}?user_id=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.detail || 'Ошибка удаления');
    }
    set(state => ({ posts: state.posts.filter(p => p.id !== postId) }));
  },
}));
