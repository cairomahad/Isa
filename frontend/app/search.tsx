import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Typography } from '../../constants/colors';

import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.8:8001';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  snippet: string;
  relevance: number;
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTypes, setSearchTypes] = useState<string[]>(['lessons', 'hadiths', 'stories']);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          types: searchTypes,
        }),
      });
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (type: string) => {
    if (searchTypes.includes(type)) {
      setSearchTypes(searchTypes.filter((t) => t !== type));
    } else {
      setSearchTypes([...searchTypes, type]);
    }
  };

  const getResultIcon = (type: string) => {
    if (type === 'lesson') return 'videocam';
    if (type === 'hadith') return 'book';
    if (type === 'story') return 'bookmarks';
    return 'document-text';
  };

  const handleResultPress = (result: SearchResult) => {
    if (result.type === 'lesson') {
      router.push(`/lesson/${result.id}`);
    }
    // Add more navigation logic for other types
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Поиск</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по урокам, хадисам..."
            placeholderTextColor={Colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          <TouchableOpacity
            style={[styles.filterChip, searchTypes.includes('lessons') && styles.filterChipActive]}
            onPress={() => toggleType('lessons')}
          >
            <Text
              style={[
                styles.filterText,
                searchTypes.includes('lessons') && styles.filterTextActive,
              ]}
            >
              Уроки
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, searchTypes.includes('hadiths') && styles.filterChipActive]}
            onPress={() => toggleType('hadiths')}
          >
            <Text
              style={[
                styles.filterText,
                searchTypes.includes('hadiths') && styles.filterTextActive,
              ]}
            >
              Хадисы
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, searchTypes.includes('stories') && styles.filterChipActive]}
            onPress={() => toggleType('stories')}
          >
            <Text
              style={[
                styles.filterText,
                searchTypes.includes('stories') && styles.filterTextActive,
              ]}
            >
              Истории
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : results.length > 0 ? (
            results.map((result, index) => (
              <TouchableOpacity
                key={index}
                style={styles.resultCard}
                onPress={() => handleResultPress(result)}
              >
                <View style={styles.resultIcon}>
                  <Ionicons
                    name={getResultIcon(result.type) as any}
                    size={24}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{result.title}</Text>
                  <Text style={styles.resultSnippet} numberOfLines={2}>
                    {result.snippet}
                  </Text>
                  <Text style={styles.resultType}>
                    {result.type === 'lesson' && '📹 Урок'}
                    {result.type === 'hadith' && '📖 Хадис'}
                    {result.type === 'story' && '📚 История'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))
          ) : query.length >= 2 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={Colors.border} />
              <Text style={styles.emptyText}>Ничего не найдено</Text>
              <Text style={styles.emptySubtext}>Попробуйте другой запрос</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={Colors.border} />
              <Text style={styles.emptyText}>Начните поиск</Text>
              <Text style={styles.emptySubtext}>Введите минимум 2 символа</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.backgroundPage,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    ...Typography.h1,
    fontSize: 28,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    ...Shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    marginLeft: 12,
  },
  filters: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.primary,
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  resultIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  resultSnippet: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  resultType: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginTop: 6,
  },
});
