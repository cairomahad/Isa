import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, FlatList,
} from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useColors } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/colors';
import { HifzService, HifzSurah } from '../../services/QuranHifzService';

const POPULAR = [114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 78, 67, 55, 36, 18, 1];

export default function SurahSelectorScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [surahs, setSurahs] = useState<HifzSurah[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    HifzService.getSurahs().then(s => { setSurahs(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return surahs;
    const q = search.toLowerCase();
    return surahs.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.name_ru.toLowerCase().includes(q) ||
      String(s.number).includes(q)
    );
  }, [surahs, search]);

  const popular = useMemo(() => surahs.filter(s => POPULAR.includes(s.number)), [surahs]);

  const selectSurah = async (surah: HifzSurah) => {
    if (!user?.id) return;
    setSaving(surah.number);
    try {
      await HifzService.startProgram(user.id, surah.number);
      router.back();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось сохранить');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: HifzSurah }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => selectSurah(item)}
      testID={`surah-${item.number}`}
    >
      <View style={styles.numBadge}>
        <Text style={styles.numText}>{item.number}</Text>
      </View>
      <View style={styles.rowNames}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowNameRu}>{item.name_ru}</Text>
      </View>
      <Text style={styles.rowAr}>{item.name_ar}</Text>
      <Text style={styles.rowAyahs}>{item.ayahs}</Text>
      {saving === item.number
        ? <ActivityIndicator size="small" color={Colors.primary} />
        : <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
      }
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Выбрать суру</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по названию или номеру..."
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          testID="surah-search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {!search.trim() && (
        <>
          <Text style={styles.sectionLabel}>Популярные</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularScroll} contentContainerStyle={styles.popularContent}>
            {popular.map(s => (
              <TouchableOpacity key={s.number} style={styles.popularChip} onPress={() => selectSurah(s)}>
                {saving === s.number
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Text style={styles.popularAr}>{s.name_ar}</Text>
                }
                <Text style={styles.popularName}>{s.name_ru}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.sectionLabel}>Все суры</Text>
        </>
      )}

      <FlatList
        data={filtered}
        keyExtractor={s => String(s.number)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (Colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.backgroundPage },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    margin: 16, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    gap: 10, borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textSecondary,
    paddingHorizontal: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  popularScroll: { maxHeight: 96 },
  popularContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  popularChip: {
    backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, minWidth: 80,
  },
  popularAr: { fontSize: 18, color: Colors.primary },
  popularName: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13,
    gap: 12, backgroundColor: Colors.backgroundPage,
  },
  numBadge: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  numText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  rowNames: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowNameRu: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  rowAr: { fontSize: 16, color: Colors.primary, minWidth: 60, textAlign: 'right' },
  rowAyahs: { fontSize: 11, color: Colors.textTertiary, minWidth: 30, textAlign: 'right' },
  sep: { height: 1, backgroundColor: Colors.border, marginLeft: 64 },
});
