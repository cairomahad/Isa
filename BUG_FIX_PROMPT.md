# ПРОМТ ДЛЯ ИСПРАВЛЕНИЯ БАГОВ — ПРИЛОЖЕНИЕ TAZAKKUR

Ты — опытный разработчик мобильных приложений на **React Native / Expo (TypeScript)**. Приложение называется **Tazakkur** — исламское приложение для изучения Корана и общения (Умма). Бэкенд развёрнут на Railway, база данных — Supabase.

Твоя задача: исправить **все перечисленные баги** строго по инструкции. Не рефакторь то, что не сломано. Вносись только минимально необходимые изменения.

---

## СТЕК И АРХИТЕКТУРА

- **Frontend**: React Native + Expo Router, TypeScript
- **Папка**: `/app/frontend/`
- **Основные файлы**:
  - `app/(tabs)/_layout.tsx` — Tab-навигация
  - `app/(tabs)/umma.tsx` — экран социальной сети «Умма»
  - `app/quran/lesson.tsx` — экран вечернего урока хифза
  - `app/quran/review.tsx` — экран утреннего повторения
  - `components/umma/UmmaTabBar.tsx` — кастомный таббар с SVG-кривой и центральной кнопкой
  - `components/umma/PostCard.tsx` — карточка поста
  - `components/umma/NewPostModal.tsx` — модал создания поста
  - `services/QuranService.ts` — сервис работы с аятами (API + кэш)
  - `constants/colors.ts` — цветовая палитра (Colors / DarkColors)
  - `contexts/ThemeContext.tsx` — контекст темы (useColors())
- **База данных (Supabase)**:
  - URL: `https://kmhhazpyalpjwspjxzry.supabase.co`
  - Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttaGhhenB5YWxwandzcGp4enJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODIyNzEsImV4cCI6MjA3ODQ1ODI3MX0.adj7b0hh3deVFN4JK6_s0Vjx_KtdLs9N9LaVkQQ__BA`
- **Цвета приложения** (из `constants/colors.ts`):
  - `primary / gold`: `#C4963A`
  - `green`: `#2E7D5B`
  - `primaryLight`: `#E8C97A`
  - `greenLight`: `#4CAF7D`
  - `tabBarActive`: `#C4963A`

---

## БАГ #1 — ХИФЗ: АУДИО ВОСПРОИЗВОДИТ ТОЛЬКО ПЕРВЫЙ АЯТ (Басмалу)

### Симптомы
- При нажатии «Слушать» на **любом** аяте урока воспроизводится один и тот же звук — аят #1 суры (Басмала / первый аят).
- Визуально: при нажатии на кнопку первого аята — загорается анимация **второго** аята (кнопка второго аята показывает состояние «воспроизводится»).

### Корневая причина (файл: `services/QuranService.ts`, метод `buildLessonAyahs`)

**Проблема 1 — неправильная логика смены суры:**
```typescript
for (let i = 0; i < maxAyahs; i++) {
  const total = await this.getSurahLength(s);
  if (a > total) {      // <-- проверка ВНУТРИ цикла, ДО вызова getAyah
    s += 1;
    a = 1;
    if (s > 114) break;
  }
  const ayahData = await this.getAyah(s, a);
  ayahs.push(ayahData);
  a++;    // <-- после первого аята a становится 2, но a начинается с 1 → правильно
}
```
Реальная ошибка: если `startAyah = 1`, то `a > total` никогда не true на первой итерации → всё нормально в теории. НО проблема в `audioUrl`:

```typescript
audioUrl: `https://cdn.islamic.network/quran/audio/128/ar.husary/${arabic?.numberInQuran ?? 1}.mp3`,
```
`arabic?.numberInQuran` может быть `0` или `undefined` при ошибке парсинга — тогда `?? 1` даёт `1` для **всех** аятов → URL всегда `.../1.mp3`.

**Проблема 2 — состояние гонки в `playAudio`:**
```typescript
const playAudio = async (url: string, key: string) => {
  await soundRef.current?.unloadAsync();
  setPlayingKey(key);           // <-- setState до создания звука
  const { sound } = await Audio.Sound.createAsync(...);
  soundRef.current = sound;
  // ...
};
```
`setPlayingKey(key)` вызывается **до** того как звук реально создан и начал играть. При быстром нажатии на аят 1 и аят 2 — состояние `playingKey` обновляется некорректно: сначала key аята 1, потом key аята 2, но звук реально ещё загружается.

### Исправления

**1.1 Исправить `audioUrl` в `getAyah` (`services/QuranService.ts`):**

Защитить от нулевого `numberInQuran`:
```typescript
const numberInQuran = arabic?.numberInQuran;
const audioUrl = numberInQuran && numberInQuran > 0
  ? `https://cdn.islamic.network/quran/audio/128/ar.husary/${numberInQuran}.mp3`
  : '';

const data: AyahData = {
  surah,
  surahNameEn: arabic?.surah?.englishName ?? `Surah ${surah}`,
  surahNameAr: arabic?.surah?.name ?? '',
  ayah,
  numberInQuran: numberInQuran ?? 0,
  arabic: arabic?.text ?? '',
  translit: translit?.text ?? '',
  audioUrl,
};
```

Также добавить дополнительный fallback через другой CDN если основной не работает:
```typescript
// Первичный CDN
const primaryUrl = numberInQuran && numberInQuran > 0
  ? `https://cdn.islamic.network/quran/audio/128/ar.husary/${numberInQuran}.mp3`
  : '';

// Резервный CDN (everyayah.com) — строится через surah:ayah
const paddedSurah = String(surah).padStart(3, '0');
const paddedAyah  = String(ayah).padStart(3, '0');
const fallbackUrl = `https://everyayah.com/data/Husary_128kbps/${paddedSurah}${paddedAyah}.mp3`;

const audioUrl = primaryUrl || fallbackUrl;
```

**1.2 Исправить состояние гонки в `playAudio` (`app/quran/lesson.tsx` и `app/quran/review.tsx`):**

Установить `playingKey` только ПОСЛЕ успешного создания звука:
```typescript
const playAudio = async (url: string, key: string) => {
  if (!url) return Alert.alert('Нет аудио', 'Аудиофайл недоступен');
  try {
    await soundRef.current?.unloadAsync();
    soundRef.current = null;
    // НЕ устанавливать setPlayingKey здесь
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    setPlayingKey(key);  // <-- только после успешного создания
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setPlayingKey(null);
        sound.unloadAsync();
      }
    });
  } catch (e) {
    setPlayingKey(null);
    Alert.alert('Ошибка', 'Не удалось воспроизвести аудио');
  }
};
```

**Применить это же исправление в `app/quran/review.tsx`** — там аналогичный `playAudio`.

---

## БАГ #2 — КНОПКА «УММА» (СОЦСЕТЬ): КРАШ ПРИЛОЖЕНИЯ

### Симптомы
- При нажатии на центральную кнопку «Умма» в таббаре — **приложение вылетает** на рабочий стол.

### Корневая причина (`components/umma/UmmaTabBar.tsx`)

Проблема в обработчике `onPress` центральной кнопки:
```typescript
const onPress = () => {
  const event = navigation.emit({
    type: 'tabPress',
    target: route.key,
    canPreventDefault: true,
  });
  if (!isFocused && !event.defaultPrevented) {
    navigation.navigate(route.name);  // <-- может вызвать краш
  }
};
```

`navigation.emit` из `@react-navigation/native` и `navigation.navigate` — смешение двух разных API. В Expo Router кастомный таббар получает `navigation` из `@react-navigation/bottom-tabs`, и метод `emit` может не возвращать корректный `event.defaultPrevented`. Это приводит к краш.

### Исправление (`components/umma/UmmaTabBar.tsx`)

Использовать безопасную навигацию через `router` из `expo-router`:
```typescript
import { useRouter } from 'expo-router';

// Внутри UmmaTabBar:
export default function UmmaTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  // ...

  // Заменить onPress:
  const onPress = () => {
    const isFocusedRoute = state.routes[state.index].name === route.name;
    if (!isFocusedRoute) {
      router.push(`/(tabs)/${route.name}`);
    }
  };
}
```

Или использовать только `navigation.navigate` без `emit`:
```typescript
const onPress = () => {
  const isFocusedRoute = state.routes[state.index].name === route.name;
  if (!isFocusedRoute) {
    navigation.navigate(route.name);
  }
};
```

Убедиться что это изменение применено **для всех** вкладок (не только центральной кнопки Умма).

---

## БАГ #3 — КНОПКА УММА ПЕРЕКРЫВАЕТ НИЖНИЕ КНОПКИ

### Симптомы
- Нижние кнопки (крайние левая и правая) в таббаре частично или полностью перекрыты SVG-полосой или центральной кнопкой.

### Корневая причина (`components/umma/UmmaTabBar.tsx`)

SVG кривая рисуется через `TabBarSvg` с `position: 'absolute', bottom: 0`. Высота контейнера `tabHeight + 20` добавляет лишние 20px, но иконки позиционируются через `position: absolute, bottom: 0` в `container`. Это создаёт коллизию: центральная кнопка вылезает вверх через `translateY: -(50/2 + 5) = -30px`, перекрывая кнопки которые находятся над таббаром.

### Исправление (`components/umma/UmmaTabBar.tsx`)

```typescript
// Было:
<View style={{ height: tabHeight + 20, position: 'relative' }}>

// Стало:
<View style={{ height: tabHeight + 30, position: 'relative' }}>
```

И в стилях `container` добавить `paddingTop` чтобы иконки не налезали на контент:
```typescript
container: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingTop: 5,
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 20,
  height: tabHeight,  // явно задать высоту
},
```

Также в `SafeAreaView` и `ScrollView` на всех экранах добавить `contentContainerStyle={{ paddingBottom: tabHeight + 30 }}` или использовать `edges={['top']}` в `SafeAreaView` чтобы таббар не перекрывал нижний контент.

---

## БАГ #4 — ЦЕНТРАЛЬНАЯ КНОПКА НЕ ЦЕНТРИРОВАНА

### Симптомы
- Кнопка «Умма» (центральная в таббаре) смещена относительно центра.

### Корневая причина
В `UmmaTabBar` маршруты `visibleRoutes` фильтруются, но индекс центрального элемента может не совпадать с физическим центром если скрытые вкладки влияют на порядок.

### Исправление (`components/umma/UmmaTabBar.tsx`)

Гарантировать что `umma` всегда третья вкладка (по центру из 5). Порядок вкладок в `_layout.tsx` уже правильный: `index, lessons, umma, zikr, settings`. Проверить что `visibleRoutes` содержит ровно 5 элементов и `umma` на позиции 2 (индекс). 

Добавить явную проверку позиции:
```typescript
// В UmmaTabBar, перед рендером
const centerIndex = Math.floor(visibleRoutes.length / 2);
// Убедиться что umma находится именно на centerIndex
```

Если порядок нарушен — переупорядочить вкладки в `_layout.tsx` или явно задать позицию.

---

## БАГ #5 — ЦВЕТА ЦЕНТРАЛЬНОЙ КНОПКИ НЕ СООТВЕТСТВУЮТ ТЕМЕ ПРИЛОЖЕНИЯ

### Симптомы
- Градиент центральной кнопки `['#7A40F8', '#4cc9f0']` — фиолетово-голубой, не соответствует цветам приложения (золото + зелёный).

### Исправление (`components/umma/UmmaTabBar.tsx`)

Заменить хардкоженные цвета на цвета из темы:
```typescript
// Было:
<LinearGradient
  colors={['#7A40F8', '#4cc9f0']}
  start={{ x: 0, y: 1 }}
  end={{ x: 1, y: 0 }}
  style={styles.centerGradient}
>

// Стало (используем Colors из ThemeContext):
const Colors = useColors();  // уже есть в компоненте

<LinearGradient
  colors={[Colors.primary, Colors.green]}  // золото → зелёный
  start={{ x: 0, y: 1 }}
  end={{ x: 1, y: 0 }}
  style={styles.centerGradient}
>
```

Аналогично исправить хардкоженные градиенты в `PostCard.tsx` (`GRADIENTS` массив) — они также используют `#7A40F8`. Заменить первый градиент в массиве на цвета приложения:
```typescript
const GRADIENTS: [string, string][] = [
  ['#C4963A', '#2E7D5B'],  // gold → green (основная тема)
  ['#C4963A', '#E8C97A'],  // gold → gold light
  ['#2E7D5B', '#4CAF7D'],  // green dark → green light
  ['#C4963A', '#4CAF7D'],  // gold → green light
  ['#C44536', '#fdac1d'],  // красный (оставить для разнообразия)
];
```

---

## БАГ #6 — UMMA: ЭКРАН НЕ ОБНОВЛЯЕТ canPostChecked ПОСЛЕ ПЕРЕЗАПУСКА

### Симптомы
- После logout/login `canPost` остаётся в состоянии `false` из предыдущей сессии из-за `canPostChecked: true` в Zustand store.

### Корневая причина (`store/ummaStore.ts`)

```typescript
checkCanPost: async (userId) => {
  if (get().canPostChecked) return;  // <-- блокирует повторный запрос навсегда
  // ...
  set({ canPost: data.can_post, canPostChecked: true });
},
```

Store не сбрасывается при смене пользователя.

### Исправление (`store/ummaStore.ts`)

Добавить метод `reset` в store и вызывать его при logout:
```typescript
// В интерфейс добавить:
reset: () => void;

// Реализация:
reset: () => set({ posts: [], page: 1, hasMore: true, isLoading: false, canPost: false, canPostChecked: false }),
```

Вызывать `useUmmaStore.getState().reset()` при logout пользователя (в `authStore` или в компоненте настроек).

---

## БАГ #7 — UMMA: FAB КНОПКА ПЕРЕКРЫВАЕТСЯ ТАББАРОМ

### Симптомы
- FAB кнопка «+» (создать пост) в экране Умма (`app/(tabs)/umma.tsx`) частично перекрывается кастомным таббаром.

### Корневая причина (`app/(tabs)/umma.tsx`)
```typescript
fabWrapper: { position: 'absolute', bottom: 90, right: 20 },
```
`bottom: 90` — хардкоженное значение, не учитывает реальную высоту таббара и safe area insets.

### Исправление (`app/(tabs)/umma.tsx`)

Использовать `useSafeAreaInsets` для корректного отступа:
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Внутри компонента:
const insets = useSafeAreaInsets();
const tabBarHeight = 58 + Math.max(insets.bottom, 8) + 30;

// В стилях (динамически):
fabWrapper: { position: 'absolute', bottom: tabBarHeight + 12, right: 20 },
```

---

## БАГ #8 — UMMA: НОВЫЕ ПОСТЫ НЕ ПОЯВЛЯЮТСЯ В ЛЕНТЕ СРАЗУ

### Симптомы
- После публикации поста через `NewPostModal` — пост появляется в начале списка, но `author_name` отображается как `undefined` или пустая строка.

### Корневая причина (`store/ummaStore.ts`, метод `createPost`)

```typescript
createPost: async (data) => {
  const res = await fetch(`${API}/api/umma/post`, { ... });
  const json = await res.json();
  // ...
  const newPost: UmmaPost = json;  // <-- json может не содержать author_name
  set(state => ({ posts: [newPost, ...state.posts] }));
  return newPost;
},
```

Бэкенд может возвращать пост без `author_name` (или с другим полем). Проверить структуру ответа бэкенда и нормализовать.

### Исправление

Убедиться, что бэкенд (`server.py`, POST `/api/umma/post`) возвращает полный объект поста включая `author_name`. Если нет — получить имя из `authStore` и добавить вручную:
```typescript
createPost: async (data) => {
  const res = await fetch(`${API}/api/umma/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || 'Ошибка создания поста');
  
  // Нормализовать: убедиться что все поля присутствуют
  const newPost: UmmaPost = {
    is_liked: false,
    likes_count: 0,
    ...json,  // данные с сервера перезаписывают дефолты
  };
  set(state => ({ posts: [newPost, ...state.posts] }));
  return newPost;
},
```

---

## БАГ #9 — QURAN: ДУБЛИРОВАНИЕ АЯТОВ ПРИ ПЕРЕХОДЕ СУРЫ

### Симптомы
- Если текущий аят = последний аят суры, то первый аят следующей суры может задублироваться в уроке.

### Корневая причина (`services/QuranService.ts`, метод `buildLessonAyahs`)

```typescript
for (let i = 0; i < maxAyahs; i++) {
  const total = await this.getSurahLength(s);
  if (a > total) {   // проверка ПОСЛЕ инкремента из предыдущей итерации
    s += 1;
    a = 1;
    if (s > 114) break;
  }
  const ayahData = await this.getAyah(s, a);
  ayahs.push(ayahData);
  a++;
}
```

Если `startAyah` уже равен `total + 1` (т.е. программа сохранила некорректное состояние), то `a > total` выполняется в первой итерации, суру меняем → `a = 1`, но потом `a++` → `a = 2` пропуская аят 1. В следующей итерации проверка снова нормальная.

### Исправление

Привести начальные значения в норму перед циклом:
```typescript
async buildLessonAyahs(surah: number, startAyah: number, week: number) {
  const { maxAyahs } = this.getPortionConfig(week);
  const ayahs: AyahData[] = [];
  let s = surah;
  let a = startAyah;

  // Нормализация начальной позиции
  const initialTotal = await this.getSurahLength(s);
  if (a > initialTotal) {
    s = s + 1 > 114 ? 1 : s + 1;
    a = 1;
  }

  for (let i = 0; i < maxAyahs; i++) {
    if (s > 114) break;
    const ayahData = await this.getAyah(s, a);
    ayahs.push(ayahData);
    a++;
    const total = await this.getSurahLength(s);
    if (a > total) {
      s += 1;
      a = 1;
    }
  }

  return { ayahs, nextSurah: s > 114 ? 114 : s, nextAyah: a };
},
```

---

## ТРЕБОВАНИЯ К ИСПРАВЛЕНИЯМ

1. **Не рефакторь** ничего кроме того что явно указано
2. **Используй `useColors()`** везде где нужен цвет — не хардкодить `#7A40F8`, `#4cc9f0` и другие цвета не из палитры
3. **Тестируй** каждый баг после исправления на устройстве или симуляторе
4. **Проверь** что приложение не крашится при:
   - нажатии на центральную кнопку «Умма»
   - воспроизведении аудио любого аята
   - прокрутке ленты до конца
   - создании нового поста
5. **Убедись** что таббар не перекрывает контент на экранах с длинными списками
6. После всех исправлений запусти `npx expo start` и проверь на iOS/Android симуляторе

---

## ПРИОРИТЕТ ИСПРАВЛЕНИЙ

| # | Баг | Приоритет | Файл |
|---|-----|-----------|------|
| 2 | Краш при нажатии кнопки Умма | КРИТИЧНО | `UmmaTabBar.tsx` |
| 1 | Аудио играет только 1-й аят | ВЫСОКИЙ | `QuranService.ts`, `lesson.tsx`, `review.tsx` |
| 3 | Кнопка Умма закрывает кнопки | ВЫСОКИЙ | `UmmaTabBar.tsx` |
| 5 | Цвета не соответствуют теме | ВЫСОКИЙ | `UmmaTabBar.tsx`, `PostCard.tsx` |
| 4 | Кнопка Умма не центрирована | СРЕДНИЙ | `UmmaTabBar.tsx` |
| 7 | FAB перекрывается таббаром | СРЕДНИЙ | `umma.tsx` |
| 6 | canPost не сбрасывается при logout | СРЕДНИЙ | `ummaStore.ts` |
| 8 | author_name пустой в новых постах | НИЗКИЙ | `ummaStore.ts` |
| 9 | Дублирование аятов при смене суры | НИЗКИЙ | `QuranService.ts` |
