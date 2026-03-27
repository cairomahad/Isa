# 🕌 Проект Tazakkur - Исламское мобильное приложение

## 📋 Описание проекта
Полнофункциональное исламское мобильное приложение на **Expo + React Native** с backend на **FastAPI + MongoDB**. Приложение предоставляет:
- Обучение исламу (видео-уроки)
- Времена намазов
- Зикр с интерактивным счетчиком
- Вопросы Шейху
- Трекер пропущенных намазов
- Хадисы
- Рейтинг пользователей
- Систему очков и геймификацию

## ✅ Что уже реализовано (Frontend)

### Экраны и функции:
1. **Главная страница** (`/app/frontend/app/(tabs)/index.tsx`)
   - Карточка со следующим намазом
   - Ежедневный аят/хадис
   - Быстрые ссылки на все функции
   - Прогресс обучения
   - Превью рейтинга

2. **Зикр** (`/app/frontend/app/(tabs)/zikr.tsx`)
   - Круговой прогресс-бар с SVG
   - 5 ежедневных зикров (Субханаллах, Альхамдулиллях, и др.)
   - Haptic feedback и анимации
   - Система очков

3. **Вопросы Шейху** (`/app/frontend/app/(tabs)/qa.tsx`)
   - Форма отправки вопросов
   - История вопросов
   - Статусы (ожидание/отвечено)

4. **Возмещение намазов** (`/app/frontend/app/(tabs)/missed-prayers.tsx`)
   - Трекер для 5 намазов (Фаджр, Зухр, Аср, Магриб, Иша)
   - Счетчики +/-
   - Общий счет

5. **Намазы** (`/app/frontend/app/(tabs)/prayers.tsx`) - уже работает
6. **Хадисы** (`/app/frontend/app/(tabs)/hadiths.tsx`) - уже работает
7. **Рейтинг** (`/app/frontend/app/(tabs)/rating.tsx`) - уже работает
8. **Настройки** (`/app/frontend/app/(tabs)/settings.tsx`) - уже работает

### Навигация:
- 5 главных вкладок: Главная, Намазы, Зикр, Вопросы, Ещё
- Дополнительные экраны доступны через меню "Ещё"

## 🔴 ЧТО НУЖНО СДЕЛАТЬ

### 1. Backend API для новых функций

#### A. Зикр API (`/api/dhikr`)
**Endpoints:**
```python
POST /api/dhikr/progress        # Сохранить прогресс зикра
GET  /api/dhikr/progress/{user_id}  # Получить прогресс пользователя
POST /api/dhikr/complete        # Отметить завершение зикра (начислить очки)
GET  /api/dhikr/daily          # Получить ежедневные зикры
```

**MongoDB Collection: `dhikr_progress`**
```javascript
{
  user_id: String,
  dhikr_id: String,
  count: Number,
  goal: Number,
  completed: Boolean,
  completed_at: Date,
  points_earned: Number,
  date: Date
}
```

#### B. Q&A API (`/api/questions`)
**Endpoints:**
```python
POST /api/questions             # Создать вопрос
GET  /api/questions/{user_id}   # Получить вопросы пользователя
GET  /api/questions/all         # Получить все вопросы (для админа)
PUT  /api/questions/{id}/answer # Ответить на вопрос (только админ)
```

**MongoDB Collection: `questions`**
```javascript
{
  id: String,
  user_id: String,
  user_name: String,
  question_text: String,
  answer_text: String | null,
  status: "pending" | "answered",
  created_at: Date,
  answered_at: Date | null,
  answered_by: String | null
}
```

#### C. Missed Prayers API (`/api/missed-prayers`)
**Endpoints:**
```python
GET  /api/missed-prayers/{user_id}       # Получить счетчики
PUT  /api/missed-prayers/{user_id}       # Обновить счетчики
POST /api/missed-prayers/{user_id}/mark  # Отметить возмещение (начислить очки)
```

**MongoDB Collection: `missed_prayers`**
```javascript
{
  user_id: String,
  fajr: Number,
  zuhr: Number,
  asr: Number,
  maghrib: Number,
  isha: Number,
  total: Number,
  last_updated: Date
}
```

#### D. Points System API (`/api/points`)
**Endpoints:**
```python
POST /api/points/add            # Начислить очки
GET  /api/points/{user_id}      # Получить баланс очков
GET  /api/points/history/{user_id}  # История начислений
```

**Правила начисления очков:**
- Завершение зикра: +5-10 очков (в зависимости от сложности)
- Возмещение намаза: +3 очка
- Просмотр урока: +10 очков
- Ежедневная активность: +5 очков

### 2. Обновить существующие API

#### Обновить модель `users` в MongoDB:
Добавить поля:
```javascript
{
  ...existing fields,
  points: Number (default: 0),
  total_dhikr_completed: Number (default: 0),
  total_prayers_compensated: Number (default: 0),
  streak_days: Number (default: 0),
  last_active: Date
}
```

### 3. Admin Panel для Q&A
Добавить в админ панель (`/app/frontend/app/admin/index.tsx`):
- Список всех вопросов
- Возможность отвечать на вопросы
- Фильтр по статусу (ожидание/отвечено)

## 🔧 Технические детали

### URLs и Preview:
- **Frontend Preview**: `https://cli-app-runner.preview.emergentagent.com`
- **Backend API**: `https://cli-app-runner.preview.emergentagent.com/api`
- **Backend port**: 8001
- **Frontend port**: 3000

### Важные файлы:
```
/app/backend/server.py           # FastAPI backend
/app/frontend/app/(tabs)/         # Все табы навигации
/app/frontend/app/_layout.tsx    # Root layout с навигацией
/app/frontend/lib/supabase.ts    # Supabase client
/app/frontend/store/authStore.ts # Zustand auth store
```

### Установленные зависимости:
✅ `react-native-svg` - для круговых прогресс-баров
✅ `expo-haptics` - для тактильных ощущений
✅ `@react-native-async-storage/async-storage` - для локального хранения
✅ `@supabase/supabase-js` - для базы данных
✅ `zustand` - для state management

### Environment Variables:
**Backend** (`/app/backend/.env`):
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=tazakkur_db
```

**Frontend** (`/app/frontend/.env`):
```bash
EXPO_PUBLIC_BACKEND_URL=https://cli-app-runner.preview.emergentagent.com
EXPO_PUBLIC_SUPABASE_URL=https://kmhhazpyalpjwspjxzry.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttaGhhenB5YWxwandzcGp4enJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODIyNzEsImV4cCI6MjA3ODQ1ODI3MX0.adj7b0hh3deVFN4JK6_s0Vjx_KtdLs9N9LaVkQQ__BA
EXPO_PUBLIC_ADMIN_PASSWORD=admin2024
```

### Цветовая схема:
```typescript
// /app/frontend/constants/colors.ts
export const Colors = {
  background: '#0A1F1A',      // Темно-зеленый
  cardDark: '#0F2920',
  darkGreen: '#1A3A2E',
  mediumGreen: '#16423C',
  gold: '#C9A55B',           // Золотой
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  tabBar: '#0A1F1A',
}
```

## ⚠️ Критические моменты (ИЗБЕГАТЬ ОШИБОК):

### 1. НЕ удаляйте react-native-svg
Библиотека **УЖЕ УСТАНОВЛЕНА**. Если будет ошибка - просто перезапустите expo:
```bash
sudo supervisorctl restart expo
```

### 2. Используйте правильные imports для React Native:
```typescript
// ✅ ПРАВИЛЬНО
import { View, Text, ScrollView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// ❌ НЕПРАВИЛЬНО
import <div>, <svg> from HTML
```

### 3. API routes ДОЛЖНЫ иметь префикс `/api`:
```python
# ✅ ПРАВИЛЬНО
@api_router.post("/dhikr/progress")

# ❌ НЕПРАВИЛЬНО
@app.post("/dhikr/progress")
```

### 4. Restart команды:
```bash
# Backend
sudo supervisorctl restart backend

# Frontend
sudo supervisorctl restart expo

# Проверить статус
sudo supervisorctl status
```

### 5. MongoDB уже запущен:
Connection string: `mongodb://localhost:27017`
Database name: `tazakkur_db`

## 📱 Как подключиться к Preview:

1. **Открыть в браузере**: `https://cli-app-runner.preview.emergentagent.com`
2. **Ввести имя** на экране приветствия
3. **Нажать "Начать"**
4. **Тестировать все функции**

### Тестовые данные:
- Любое имя (2-30 символов)
- Анонимная авторизация работает
- Город по умолчанию: Москва

## 🎯 Порядок работы:

1. **Создать Backend API** для:
   - Зикра (прогресс, очки)
   - Q&A (вопросы/ответы)
   - Трекера намазов
   - Системы очков

2. **Подключить Frontend к Backend**:
   - Обновить `zikr.tsx` для работы с API
   - Обновить `qa.tsx` для работы с API
   - Обновить `missed-prayers.tsx` для работы с API

3. **Добавить в Admin Panel**:
   - Раздел для ответов на вопросы
   - Статистику по пользователям

4. **Протестировать** через testing agent

## 📂 Структура MongoDB Collections:

**Существующие:**
- `users` - пользователи
- `video_lessons` - уроки
- `course_progress` - прогресс обучения
- `hadith` - хадисы

**Нужно создать:**
- `dhikr_progress` - прогресс зикра
- `questions` - вопросы и ответы
- `missed_prayers` - счетчики пропущенных намазов
- `points_history` - история начислений очков

## 🔐 Аутентификация:

Используется **Supabase Auth** (анонимная авторизация).
User ID берется из: `session.user.id` или `user.app_user_id`

## 🎨 UI/UX Guidelines:

- Минимальный touch target: 44x44 пикселей
- Использовать `Haptics.impactAsync()` для тактильных ощущений
- Все интерактивные элементы должны иметь анимацию
- Темная тема с золотыми акцентами
- Арабский текст для религиозного контента

## 📝 Важные заметки:

1. **Все Frontend файлы работают** - не нужно их переделывать
2. **Нужен только Backend** для новых функций
3. **Подключение к API** уже настроено через `EXPO_PUBLIC_BACKEND_URL`
4. **MongoDB schemas** нужно создать в backend
5. **Тестирование** делать через `deep_testing_backend_v2`

## 🚀 Команды для запуска:

```bash
# Перезапустить все сервисы
sudo supervisorctl restart all

# Проверить логи
tail -f /var/log/supervisor/expo.out.log
tail -f /var/log/supervisor/backend.err.log

# Очистить кэш (если нужно)
rm -rf /app/frontend/.metro-cache
```

## ✅ Чеклист задач:

### Backend API:
- [ ] Создать Pydantic модели для Dhikr, Questions, MissedPrayers
- [ ] Создать CRUD endpoints для зикра
- [ ] Создать CRUD endpoints для Q&A
- [ ] Создать CRUD endpoints для трекера намазов
- [ ] Реализовать систему очков
- [ ] Обновить модель User с полями points, streak_days, etc.
- [ ] Добавить middleware для начисления очков

### Интеграция Frontend-Backend:
- [ ] Подключить zikr.tsx к API
- [ ] Подключить qa.tsx к API  
- [ ] Подключить missed-prayers.tsx к API
- [ ] Обновить index.tsx для отображения реальных очков
- [ ] Обновить rating.tsx для отображения рейтинга по очкам

### Admin Panel:
- [ ] Добавить список вопросов
- [ ] Добавить форму для ответов
- [ ] Добавить статистику

### Тестирование:
- [ ] Протестировать все Backend endpoints
- [ ] Протестировать Frontend интеграцию
- [ ] Проверить систему очков

---

## 🎯 Цель: 
**Создать полностью рабочий Backend и подключить его к готовому Frontend, чтобы все функции работали end-to-end.**

**Приоритет**: Backend API → Интеграция → Тестирование

**Ожидаемый результат**: Полностью функциональное исламское приложение с работающими зикром, Q&A, трекером намазов и системой очков.
