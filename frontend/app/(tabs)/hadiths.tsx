import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Shadows } from '../../constants/colors';

type DailyContent = {
  hadith?: { arabic_text?: string; russian_text?: string; source?: string } | null;
  story?: { title?: string; text?: string; content?: string } | null;
  benefit?: { text?: string } | null;
};

export default function HadithsScreen() {
  const [content, setContent] = useState<DailyContent>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'hadith' | 'story' | 'benefit'>('hadith');

  const fetchContent = useCallback(async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://tazakkur-islamic.preview.emergentagent.com';
      
      const [hadithRes, storyRes, benefitRes] = await Promise.all([
        fetch(`${backendUrl}/api/hadith/daily`),
        fetch(`${backendUrl}/api/story/daily`),
        fetch(`${backendUrl}/api/benefit/daily`),
      ]);

      const hadithData = hadithRes.ok ? await hadithRes.json() : null;
      const storyData = storyRes.ok ? await storyRes.json() : null;
      const benefitData = benefitRes.ok ? await benefitRes.json() : null;

      setContent({
        hadith: hadithData || DEMO_HADITH,
        story: storyData || DEMO_STORY,
        benefit: benefitData || DEMO_BENEFIT,
      });
    } catch (err) {
      console.warn('Error fetching content:', err);
      setContent({ hadith: DEMO_HADITH, story: DEMO_STORY, benefit: DEMO_BENEFIT });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContent();
  };

  const TABS = [
    { key: 'hadith', label: 'Хадис', icon: 'book' as const },
    { key: 'story', label: 'История', icon: 'scroll' as const },
    { key: 'benefit', label: 'Польза', icon: 'bulb' as const },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Знания дня</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key as typeof activeTab)}
              testID={`tab-${tab.key}`}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={activeTab === tab.key ? Colors.background : Colors.mediumGreen}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.gold} size="large" />
          </View>
        ) : (
          <>
            {activeTab === 'hadith' && content.hadith && (
              <View style={styles.mainCard} testID="hadith-card">
                <View style={styles.cardBadge}>
                  <Ionicons name="book" size={14} color={Colors.background} />
                  <Text style={styles.cardBadgeText}>Хадис дня</Text>
                </View>

                {content.hadith.arabic_text && (
                  <Text style={styles.arabicText}>{content.hadith.arabic_text}</Text>
                )}

                <View style={styles.divider} />

                <Text style={styles.russianText}>
                  {content.hadith.russian_text || 'Хадис не найден'}
                </Text>

                {content.hadith.source && (
                  <View style={styles.sourceRow}>
                    <Ionicons name="bookmark" size={14} color={Colors.gold} />
                    <Text style={styles.sourceText}>{content.hadith.source}</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'story' && content.story && (
              <View style={styles.mainCard} testID="story-card">
                <View style={[styles.cardBadge, styles.storyBadge]}>
                  <Ionicons name="scroll" size={14} color={Colors.background} />
                  <Text style={styles.cardBadgeText}>История дня</Text>
                </View>

                {content.story.title && (
                  <Text style={styles.storyTitle}>{content.story.title}</Text>
                )}

                <Text style={styles.russianText}>
                  {content.story.text || content.story.content || 'История не найдена'}
                </Text>
              </View>
            )}

            {activeTab === 'benefit' && content.benefit && (
              <View style={styles.mainCard} testID="benefit-card">
                <View style={[styles.cardBadge, styles.benefitBadge]}>
                  <Ionicons name="bulb" size={14} color={Colors.background} />
                  <Text style={styles.cardBadgeText}>Польза дня</Text>
                </View>

                <Text style={styles.russianText}>
                  {content.benefit.text || 'Польза не найдена'}
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const DEMO_HADITH = {
  arabic_text: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
  russian_text: '«Лучший из вас тот, кто выучил Коран и обучил ему других.»',
  source: 'Сахих аль-Бухари',
};
const DEMO_STORY = {
  title: 'Терпение — путь к успеху',
  text: 'Посланник Аллаха (ﷺ) сказал: «Знай, что в терпении при том, что тебе не нравится — великое благо. Помощь (от Аллаха) приходит вместе с терпением...»',
};
const DEMO_BENEFIT = {
  text: '💡 Пусть ваш язык всегда будет влажным от поминания Аллаха. Произносите «Субхана-Ллах» часто — это легкие слова на языке, но тяжелые на весах.',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, paddingHorizontal: 16 },
  center: { paddingVertical: 60, alignItems: 'center' },
  header: { paddingVertical: 16, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary },
  headerDate: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.cardDark,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: { backgroundColor: Colors.gold },
  tabText: { fontSize: 13, color: Colors.mediumGreen, fontWeight: '500' },
  activeTabText: { color: Colors.background, fontWeight: 'bold' },
  mainCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    ...Shadows.gold,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
    gap: 6,
  },
  storyBadge: { backgroundColor: Colors.mediumGreen },
  benefitBadge: { backgroundColor: Colors.lightGreen },
  cardBadgeText: { fontSize: 12, fontWeight: 'bold', color: Colors.background },
  arabicText: {
    fontSize: 24,
    color: Colors.gold,
    textAlign: 'right',
    lineHeight: 40,
    marginBottom: 12,
  },
  divider: { height: 1, backgroundColor: Colors.darkGreen, marginBottom: 16 },
  storyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gold,
    marginBottom: 12,
  },
  russianText: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 26,
    fontStyle: 'italic',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  sourceText: { fontSize: 13, color: Colors.textSecondary },
});
